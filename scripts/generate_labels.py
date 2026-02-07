"""
QR Code Label Generator for Welding Parts
Generates a sheet of 1" x 1" labels with QR codes and serial numbers
"""

import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
import io

def generate_qr_label(serial_number, qr_data=None):
    """
    Generate a single label with QR code and text

    Args:
        serial_number: The serial number to display (e.g., "WELD-001")
        qr_data: Optional custom data for QR code. If None, uses serial_number

    Returns:
        PIL Image object of the label
    """
    # Use serial number as QR data if not provided
    if qr_data is None:
        qr_data = serial_number

    # Generate QR code
    qr = qrcode.QRCode(
        version=1,  # Small QR code
        error_correction=qrcode.constants.ERROR_CORRECT_H,  # High error correction
        box_size=10,
        border=1,
    )
    qr.add_data(qr_data)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="black", back_color="white")

    # Create label image (1 inch = 300 DPI for printing)
    label_size = 300  # 300px = 1 inch at 300 DPI
    label = Image.new('RGB', (label_size, label_size), 'white')

    # Resize QR code to fit (leave room for text at bottom)
    qr_height = int(label_size * 0.65)  # QR takes 65% of height
    qr_img = qr_img.resize((qr_height, qr_height), Image.Resampling.LANCZOS)

    # Paste QR code centered at top
    qr_x = (label_size - qr_height) // 2
    qr_y = 10
    label.paste(qr_img, (qr_x, qr_y))

    # Add text below QR code
    draw = ImageDraw.Draw(label)

    try:
        # Try to use a nice font
        font = ImageFont.truetype("arial.ttf", 24)
    except:
        # Fallback to default font
        font = ImageFont.load_default()

    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), serial_number, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    text_x = (label_size - text_width) // 2
    text_y = qr_y + qr_height + 15

    draw.text((text_x, text_y), serial_number, fill='black', font=font)

    return label


def generate_label_sheet(start_number=1, count=80, prefix="WELD", output_file="labels.pdf"):
    """
    Generate a full sheet of labels as PDF

    Args:
        start_number: Starting number for serial sequence
        count: Number of labels to generate (default 80 for 8x10 sheet)
        prefix: Prefix for serial numbers (default "WELD")
        output_file: Output PDF filename
    """
    # Create PDF
    c = canvas.Canvas(output_file, pagesize=letter)
    page_width, page_height = letter

    # Label dimensions (1 inch)
    label_width = 1 * inch
    label_height = 1 * inch

    # Calculate margins to center the grid
    cols = 8
    rows = 10

    # Center the labels on the page
    grid_width = cols * label_width
    grid_height = rows * label_height

    margin_x = (page_width - grid_width) / 2
    margin_y = (page_height - grid_height) / 2

    print(f"Generating {count} labels...")

    label_index = 0

    for row in range(rows):
        for col in range(cols):
            if label_index >= count:
                break

            # Generate serial number
            serial_num = f"{prefix}-{start_number + label_index:03d}"

            # Generate label image
            label_img = generate_qr_label(serial_num)

            # Save to temporary buffer
            img_buffer = io.BytesIO()
            label_img.save(img_buffer, format='PNG', dpi=(300, 300))
            img_buffer.seek(0)

            # Calculate position
            x = margin_x + (col * label_width)
            y = page_height - margin_y - ((row + 1) * label_height)

            # Draw on PDF
            c.drawImage(
                ImageReader(img_buffer),
                x, y,
                width=label_width,
                height=label_height,
                preserveAspectRatio=True
            )

            label_index += 1

            if (label_index) % 10 == 0:
                print(f"  Generated {label_index}/{count} labels...")

        if label_index >= count:
            break

    c.save()
    print(f"[OK] PDF saved to: {output_file}")
    print(f"  Total labels: {label_index}")
    print(f"  Layout: {cols} columns x {rows} rows")


if __name__ == "__main__":
    # Generate a sheet of 80 labels (WELD-001 through WELD-080)
    generate_label_sheet(
        start_number=1,
        count=80,
        prefix="WELD",
        output_file="weld_labels.pdf"
    )

    print("\n[READY] Ready to print on 1\" x 1\" label sheets!")
    print("   Recommended: 8.5\" x 11\" sheets with 80 labels (8 cols x 10 rows)")
