import os

def export_codebase(root_dir, output_file):
    exclude_dirs = {'.git', 'node_modules', '__pycache__', 'venv', '.venv', 'dist', 'build', '.next'}
    exclude_exts = {'.zip', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.pdf', '.db', '.sqlite3', '.pyc'}

    with open(output_file, 'w', encoding='utf-8') as outfile:
        outfile.write("# Codebase Export\n\n")
        
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in exclude_exts or file == 'export_code.py' or file.endswith('.zip') or file.endswith('.lock'):
                    continue
                    
                filepath = os.path.join(root, file)
                relpath = os.path.relpath(filepath, root_dir)
                
                try:
                    with open(filepath, 'r', encoding='utf-8') as infile:
                        content = infile.read()
                        
                    outfile.write(f"## File: `{relpath}`\n\n")
                    outfile.write(f"```{ext[1:] if ext else 'text'}\n")
                    outfile.write(content)
                    outfile.write(f"\n```\n\n")
                except Exception as e:
                    print(f"Skipping {filepath}: {e}")

if __name__ == '__main__':
    export_codebase('c:\\dev\\WellOps1', 'c:\\dev\\WellOps1_code_export.md')
    print("Export complete: c:\\dev\\WellOps1_code_export.md")
