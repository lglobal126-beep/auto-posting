from pathlib import Path
from typing import Optional

from PIL import Image
import pytesseract


def extract_text_from_receipt(image_path: str) -> str:
  """
  영수증 이미지 경로를 받아 OCR로 텍스트를 추출합니다.
  실제 경로는 Supabase Storage에서 다운로드한 후 임시 파일로 저장된 것을 기준으로 합니다.
  """
  img = Image.open(Path(image_path))
  text = pytesseract.image_to_string(img, lang="kor+eng")
  return text


def extract_restaurant_name(ocr_text: str) -> Optional[str]:
  """
  OCR 텍스트에서 상호명을 추출하는 간단한 플레이스홀더.
  실제로는 패턴/규칙을 더 정교하게 다듬어야 합니다.
  """
  for line in ocr_text.splitlines():
    line = line.strip()
    if not line:
      continue
    if "점" in line or "식당" in line or "주식회사" in line:
      return line
  return None

