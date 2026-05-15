#!/usr/bin/env python3
"""Convert markdown RFP to Word document."""
import subprocess, os, sys

def convert_md_to_docx(md_path, docx_path):
    """Use pandoc to convert markdown to Word."""
    
    # Check if pandoc is available
    try:
        subprocess.run(['pandoc', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("❌ pandoc not installed.")
        print("   Install with: sudo apt-get install pandoc")
        print("   Or visit: https://pandoc.org/installing.html")
        return False
    
    # Check for reference doc
    ref_doc = os.path.expanduser('~/.openclaw/workspace/rfp-revisions/templates/reference.docx')
    ref_doc_arg = f'--reference-doc={ref_doc}' if os.path.exists(ref_doc) else ''
    
    cmd = ['pandoc', md_path, '-o', docx_path, '--toc', '--toc-depth=3']
    if ref_doc_arg:
        cmd.append(ref_doc_arg)
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        
        # Verify output
        if os.path.exists(docx_path) and os.path.getsize(docx_path) > 0:
            print(f"✅ Word document created: {docx_path}")
            print(f"📄 Size: {os.path.getsize(docx_path):,} bytes")
            return True
        else:
            print("❌ Output file not created or empty")
            return False
            
    except subprocess.CalledProcessError as e:
        print(f"❌ Conversion failed: {e.stderr}")
        return False

def fallback_convert(md_path, docx_path):
    """Fallback: create a simple HTML that can be opened in Word."""
    try:
        import markdown
        
        with open(md_path) as f:
            md_content = f.read()
        
        html_content = markdown.markdown(md_content, extensions=['tables', 'toc'])
        
        html_doc = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>RFP Document</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 20px; }}
        h1 {{ color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }}
        h2 {{ color: #34495e; border-bottom: 1px solid #bdc3c7; padding-bottom: 5px; margin-top: 30px; }}
        h3 {{ color: #7f8c8d; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
        th {{ background-color: #3498db; color: white; }}
        tr:nth-child(even) {{ background-color: #f2f2f2; }}
        blockquote {{ border-left: 4px solid #3498db; margin: 20px 0; padding: 10px 20px; background: #f8f9fa; }}
        code {{ background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }}
    </style>
</head>
<body>
{html_content}
</body>
</html>"""
        
        html_path = docx_path.replace('.docx', '.html')
        with open(html_path, 'w') as f:
            f.write(html_doc)
        
        print(f"⚠️  pandoc not available. Created HTML fallback: {html_path}")
        print(f"   Open this file in your browser, then copy/paste into Word.")
        return True
        
    except ImportError:
        # Ultimate fallback: just copy the markdown
        md_copy = docx_path.replace('.docx', '.md')
        with open(md_path) as f:
            content = f.read()
        with open(md_copy, 'w') as f:
            f.write(content)
        print(f"⚠️  Created markdown copy: {md_copy}")
        print(f"   Install pandoc for proper Word conversion.")
        return True

def main():
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True, help='Input markdown file')
    parser.add_argument('--output', required=True, help='Output Word file')
    args = parser.parse_args()
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    # Try pandoc first
    success = convert_md_to_docx(args.input, args.output)
    
    if not success:
        # Try fallback
        fallback_convert(args.input, args.output)

if __name__ == '__main__':
    main()
