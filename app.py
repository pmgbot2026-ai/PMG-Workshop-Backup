"""
Car Insurance Document Scanner - Flask Backend
Upload photos of car insurance documents and extract data via AI vision.
Uses qwen3.5:cloud for direct image understanding (best Thai support).
"""

import os
import json
import uuid
import re
import base64
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB max
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'heic'}

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Store extracted data in memory
extracted_data = {}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def encode_image(filepath):
    with open(filepath, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def get_mime_type(filepath):
    ext = filepath.rsplit('.', 1)[-1].lower()
    return {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png',
            'webp': 'image/webp'}.get(ext, 'image/jpeg')


def call_vision_api(images_with_types):
    """
    Use qwen3.5:cloud vision model to read documents directly from images.
    This model reads Thai text much better than Tesseract OCR.
    Also runs Tesseract as fallback and merges results.
    """
    import requests
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter

    doc_type_labels = {
        'policy_type1': 'กรมธรรม์ประกันภัยรถยนต์ประเภท 1',
        'por_ror_bor': 'พ.ร.บ.คุ้มครองผู้ได้รับบาดเจ็บ',
        'driving_license': 'ใบขับขี่',
        'car_registration': 'สมุดทะเบียนรถ',
        'national_id': 'บัตรประชาชน',
    }

    # Step 1: Run Tesseract OCR on each image as supplementary data
    ocr_texts = {}
    for img_path, doc_type in images_with_types:
        try:
            img = Image.open(img_path)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            # Upscale small images
            w, h = img.size
            if w < 1500:
                scale = 1500 / w
                img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            # Enhance
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.8)
            img = img.filter(ImageFilter.SHARPEN)
            img = img.convert('L')

            best_text = ""
            for psm in [4, 6, 3]:
                try:
                    text = pytesseract.image_to_string(img, lang='tha+eng', config=f'--psm {psm} --oem 3').strip()
                    if len(text) > len(best_text):
                        best_text = text
                except Exception:
                    continue

            ocr_texts[doc_type] = best_text
        except Exception as e:
            ocr_texts[doc_type] = f"[OCR error: {str(e)}]"

    # Step 2: Build vision prompt with images AND OCR text
    image_contents = []
    for img_path, doc_type in images_with_types:
        b64 = encode_image(img_path)
        mime = get_mime_type(img_path)
        image_contents.append({
            "type": "image_url",
            "image_url": {"url": f"data:{mime};base64,{b64}"}
        })

    # Build OCR context as supplementary info
    ocr_context = ""
    for doc_type, text in ocr_texts.items():
        if text and not text.startswith("[OCR error"):
            label = doc_type_labels.get(doc_type, doc_type)
            ocr_context += f"\n=== OCR เสริม: {label} ===\n{text}\n"

    prompt = f"""คุณเป็นผู้เชี่ยวชาญด้านการอ่านเอกสารประกันภัยรถยนต์ไทย กรุณาอ่านข้อมูลจากรูปภาพทั้งหมดแล้วส่งข้อมูลกลับเป็น JSON เท่านั้น (ไม่มี markdown code block)

โครงสร้าง JSON ที่ต้องส่งกลับ:
{{
  "customer": {{
    "name_th": "ชื่อ-นามสกุล ภาษาไทย",
    "name_en": "Name in English",
    "id_card": "เลขบัตรประชาชน",
    "address": "ที่อยู่",
    "phone": "เบอร์โทร",
    "email": "อีเมล"
  }},
  "vehicle": {{
    "brand": "ยี่ห้อ",
    "model": "รุ่น",
    "year": "ปีรถ",
    "color": "สี",
    "license_plate": "ทะเบียน",
    "province": "จังหวัด",
    "chassis_no": "เลขตัวถัง",
    "engine_no": "เลขเครื่องยนต์",
    "cc": "ซีซี",
    "vehicle_type": "ประเภทรถ",
    "registration_date": "วันจดทะเบียน",
    "owner_name": "เจ้าของรถ"
  }},
  "insurance": {{
    "company": "บริษัทประกัน",
    "policy_number": "เลขกรมธรรม์",
    "policy_type": "ประเภทประกัน (1/2/3/2+/3+)",
    "effective_date": "วันเริ่มต้นความคุ้มครอง",
    "expiry_date": "วันสิ้นสุดความคุ้มครอง",
    "premium": "เบี้ยประกันภัย",
    "por_ror_bor_premium": "เบี้ย พ.ร.บ.",
    "total_premium": "เบี้ยรวม",
    "deductible": "ค่าเสียหายส่วนแรก",
    "sum_insured": "ทุนประกัน",
    "coverage_details": "รายละเอียดความคุ้มครอง"
  }},
  "tax": {{
    "tax_amount": "ค่าภาษี",
    "tax_year": "ปีภาษี",
    "tax_paid_date": "วันที่จ่ายภาษี",
    "tax_receipt_no": "เลขใบเสร็จภาษี"
  }},
  "driving_license": {{
    "license_number": "เลขใบขับขี่",
    "license_type": "ประเภทใบขับขี่",
    "license_holder": "ชื่อผู้ถือใบขับขี่",
    "license_expiry": "วันหมดอายุใบขับขี่",
    "license_issued_date": "วันออกบัตร"
  }}
}}

หมายเหตุ:
- ถ้าไม่พบข้อมูลฟิลด์ไหน ให้ใส่ค่าว่าง ""
- อ่านข้อมูลให้ละเอียดที่สุด ทุกตัวเลข ทุกวันที่
- พยายามอ่านเลขทะเบียน เลขตัวถัง เลขเครื่องยนต์ ให้ถูกต้อง
- อ่านชื่อบริษัทประกันให้ชัดเจน
- อ่านยอดเงิน เบี้ยประกัน ค่าภาษี ให้ถูกต้อง
- ส่ง JSON เท่านั้น ไม่มีคำอธิบาย
"""

    # Add OCR text as supplementary hint
    if ocr_context.strip():
        prompt += f"\n\nข้อความ OCR เสริม (ใช้ช่วยอ่านกรณีรูปภาพไม่ชัด):\n{ocr_context}"

    api_base = os.environ.get('OLLAMA_API_BASE', 'http://127.0.0.1:11434/v1')
    api_key = os.environ.get('OLLAMA_API_KEY', 'ollama')
    model = os.environ.get('VISION_MODEL', 'qwen3.5:cloud')

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    payload = {
        "model": model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    *image_contents
                ]
            }
        ],
        "max_tokens": 4096,
        "temperature": 0.1
    }

    try:
        resp = requests.post(f"{api_base}/chat/completions", headers=headers, json=payload, timeout=300)
        resp.raise_for_status()
        result = resp.json()
        msg = result['choices'][0]['message']
        text = msg.get('content', '').strip()

        # If content is empty but reasoning exists, extract from reasoning
        if not text and msg.get('reasoning'):
            text = msg['reasoning'].strip()

        # Clean JSON
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)

        # Find JSON object in the text
        json_match = re.search(r'\{[\s\S]*\}', text)
        if json_match:
            text = json_match.group(0)

        parsed = json.loads(text)
        # Attach OCR raw data
        parsed['ocr_raw'] = ocr_texts
        return parsed
    except json.JSONDecodeError as e:
        return {"error": f"JSON parse error: {e}", "raw_text": text[:3000] if 'text' in dir() else "", "ocr_raw": ocr_texts}
    except Exception as e:
        return {"error": str(e), "raw_text": "", "ocr_raw": ocr_texts}


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/api/upload', methods=['POST'])
def upload_files():
    """Upload multiple document images and process them."""
    if 'files' not in request.files:
        return jsonify({'error': 'No files uploaded'}), 400

    files = request.files.getlist('files')
    doc_types = request.form.getlist('doc_types')

    if len(files) != len(doc_types):
        return jsonify({'error': 'Mismatch between files and document types'}), 400

    session_id = str(uuid.uuid4())
    session_dir = os.path.join(app.config['UPLOAD_FOLDER'], session_id)
    os.makedirs(session_dir, exist_ok=True)

    saved_files = []
    for i, (file, doc_type) in enumerate(zip(files, doc_types)):
        if file and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[-1].lower()
            filename = f"{doc_type}_{i}.{ext}"
            filepath = os.path.join(session_dir, filename)
            file.save(filepath)
            saved_files.append((filepath, doc_type))

    if not saved_files:
        return jsonify({'error': 'No valid files uploaded'}), 400

    # Process with vision AI (direct image reading + OCR supplementary)
    result = call_vision_api(saved_files)

    if 'error' in result and 'customer' not in result:
        return jsonify(result), 500

    # Store result
    result['session_id'] = session_id
    extracted_data[session_id] = result

    # Save to file
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}.json')
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    return jsonify(result)


@app.route('/api/save', methods=['POST'])
def save_data():
    """Save corrected/edited data."""
    data = request.json
    session_id = data.get('session_id', str(uuid.uuid4()))
    extracted_data[session_id] = data

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}.json')
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    return jsonify({'status': 'saved', 'session_id': session_id})


@app.route('/api/export/<session_id>', methods=['GET'])
def export_data(session_id):
    """Export data as JSON file."""
    if session_id in extracted_data:
        data = extracted_data[session_id]
    else:
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], f'{session_id}.json')
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            return jsonify({'error': 'Session not found'}), 404

    return jsonify(data)


@app.route('/api/ocr-test', methods=['POST'])
def ocr_test():
    """Test OCR on a single image."""
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400

    file = request.files['file']
    if not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file type'}), 400

    import tempfile
    with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
        file.save(tmp)
        tmp_path = tmp.name

    try:
        img = Image.open(tmp_path)
        if img.mode != 'RGB':
            img = img.convert('RGB')
        w, h = img.size
        if w < 1500:
            scale = 1500 / w
            img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.8)
        img = img.filter(ImageFilter.SHARPEN)
        img = img.convert('L')

        text = pytesseract.image_to_string(img, lang='tha+eng', config='--psm 6 --oem 3').strip()
        return jsonify({'ocr_text': text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5555))
    app.run(host='0.0.0.0', port=port, debug=True)