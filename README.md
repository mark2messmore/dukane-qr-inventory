# QR Code Label Generator for Welding Parts

Generate sheets of 1" × 1" labels with QR codes and serial numbers for tracking welded parts.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Generate labels:**
   ```bash
   python generate_labels.py
   ```

3. **Print** the generated `weld_labels.pdf` on 1" × 1" label sheets

## Output

- Creates 80 labels per sheet (8 columns × 10 rows)
- Each label contains:
  - QR code with the serial number
  - Human-readable text (e.g., WELD-001)

## Customization

Edit `generate_labels.py` to change:

```python
generate_label_sheet(
    start_number=1,      # Start from WELD-001
    count=80,            # Number of labels
    prefix="WELD",       # Change prefix
    output_file="weld_labels.pdf"
)
```

## Label Sheet Compatibility

Designed for standard 8.5" × 11" sheets with:
- 1" × 1" square labels
- 8 columns × 10 rows (80 labels per sheet)
- Compatible with: [The Shipping Store S001](https://theshippingstore.com/products/1-x-1-square-laser-inkjet-labels-s001)
