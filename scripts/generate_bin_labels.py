"""
Generate QR code labels for bins and locations
"""
import qrcode
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
import io


def generate_qr_label(label_id, label_text=None, qr_size_ratio=0.65, font_size=24):
    """
    Generate a single label with QR code and text

    Args:
        label_id: The ID to encode in QR code (e.g., "BIN-001")
        label_text: Optional text to display (defaults to label_id)
        qr_size_ratio: Ratio of QR code to label height (default 0.65)
        font_size: Font size for label text

    Returns:
        PIL Image object of the label
    """
    if label_text is None:
        label_text = label_id

    # Generate QR code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=1,
    )
    qr.add_data(label_id)
    qr.make(fit=True)

    qr_img = qr.make_image(fill_color="black", back_color="white")

    # Create label image (1 inch = 300 DPI for printing)
    label_size = 300
    label = Image.new('RGB', (label_size, label_size), 'white')

    # Resize QR code to fit
    qr_height = int(label_size * qr_size_ratio)
    qr_img = qr_img.resize((qr_height, qr_height), Image.Resampling.LANCZOS)

    # Paste QR code centered at top
    qr_x = (label_size - qr_height) // 2
    qr_y = 10
    label.paste(qr_img, (qr_x, qr_y))

    # Add text below QR code
    draw = ImageDraw.Draw(label)

    try:
        font = ImageFont.truetype("arial.ttf", font_size)
    except:
        font = ImageFont.load_default()

    bbox = draw.textbbox((0, 0), label_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]

    text_x = (label_size - text_width) // 2
    text_y = qr_y + qr_height + 15

    draw.text((text_x, text_y), label_text, fill='black', font=font)

    return label


def generate_label_sheet(labels, output_file="labels.pdf", cols=8, rows=10):
    """
    Generate a full sheet of labels as PDF

    Args:
        labels: List of (id, text) tuples
        output_file: Output PDF filename
        cols: Number of columns (default 8)
        rows: Number of rows (default 10)
    """
    c = canvas.Canvas(output_file, pagesize=letter)
    page_width, page_height = letter

    label_width = 1 * inch
    label_height = 1 * inch

    grid_width = cols * label_width
    grid_height = rows * label_height

    margin_x = (page_width - grid_width) / 2
    margin_y = (page_height - grid_height) / 2

    print(f"Generating {len(labels)} labels...")

    label_index = 0
    labels_per_page = cols * rows

    for label_idx, (label_id, label_text) in enumerate(labels):
        # Check if we need a new page
        if label_index > 0 and label_index % labels_per_page == 0:
            c.showPage()
            print(f"  Starting new page (page {label_index // labels_per_page + 1})")

        row = (label_index % labels_per_page) // cols
        col = (label_index % labels_per_page) % cols

        # Generate label image
        label_img = generate_qr_label(label_id, label_text)

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
            print(f"  Generated {label_index}/{len(labels)} labels...")

    c.save()
    print(f"[OK] PDF saved to: {output_file}")
    print(f"  Total labels: {label_index}")
    print(f"  Total pages: {(label_index - 1) // labels_per_page + 1}")


if __name__ == "__main__":
    # Generate bin labels (BIN-001 through BIN-050)
    print("\n=== Generating Bin Labels ===")
    bin_labels = [(f"BIN-{i:03d}", f"BIN-{i:03d}") for i in range(1, 51)]
    generate_label_sheet(bin_labels, "bin_labels.pdf")

    # Generate lab rack labels
    print("\n=== Generating Lab Rack Labels ===")
    lab_racks = [
        ("LAB-RACK-1", "Lab Rack 1"),
        ("LAB-RACK-2", "Lab Rack 2"),
        ("LAB-RACK-3", "Lab Rack 3"),
    ]

    # Generate shop rack labels
    print("\n=== Generating Shop Rack Labels ===")
    shop_racks = [
        ("SHOP-RACK-1", "Shop Rack 1"),
        ("SHOP-RACK-2", "Shop Rack 2"),
        ("SHOP-RACK-3", "Shop Rack 3"),
        ("SHOP-RACK-4", "Shop Rack 4"),
    ]

    # Generate Husky toolbox labels (3 toolboxes, 5 drawers each)
    print("\n=== Generating Husky Toolbox Labels ===")
    husky_labels = []
    for box in range(1, 4):
        for drawer in range(1, 6):
            husky_labels.append((f"HUSKY-{box}-D{drawer}", f"Husky {box}\nDrawer {drawer}"))

    # Generate lab table labels
    print("\n=== Generating Lab Table Labels ===")
    lab_tables = [
        ("LAB-TABLE-1", "Lab Table 1"),
        ("LAB-TABLE-2", "Lab Table 2"),
        ("LAB-TABLE-3", "Lab Table 3"),
    ]

    # Generate lab machine labels
    print("\n=== Generating Lab Machine Labels ===")
    lab_machines = [
        ("LAB-MACHINE-1", "Lab Machine 1"),
        ("LAB-MACHINE-2", "Lab Machine 2"),
        ("LAB-MACHINE-3", "Lab Machine 3"),
    ]

    # Combine all location labels
    all_locations = lab_racks + shop_racks + husky_labels + lab_tables + lab_machines
    generate_label_sheet(all_locations, "location_labels.pdf")

    print("\n[READY] Label sheets generated:")
    print("  - bin_labels.pdf (50 bin labels)")
    print("  - location_labels.pdf (racks, toolboxes, tables, machines)")
    print("\nPrint on 1\" x 1\" label sheets and start labeling!")
