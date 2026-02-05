import tkinter as tk
from tkinter import filedialog, messagebox, ttk
import threading
import os

class DoclingConverterApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Docling Markdown Converter")
        self.root.geometry("500x300")
        self.root.resizable(False, False)

        # Center the window
        self.root.eval('tk::PlaceWindow . center')

        # Main frame with padding
        main_frame = ttk.Frame(root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)

        # Title
        title_label = ttk.Label(main_frame, text="Document to Markdown Converter",
                                font=('Helvetica', 16, 'bold'))
        title_label.pack(pady=(0, 20))

        # File selection frame
        file_frame = ttk.Frame(main_frame)
        file_frame.pack(fill=tk.X, pady=10)

        self.file_path = tk.StringVar()
        self.file_entry = ttk.Entry(file_frame, textvariable=self.file_path, width=50)
        self.file_entry.pack(side=tk.LEFT, padx=(0, 10))

        browse_btn = ttk.Button(file_frame, text="Browse", command=self.browse_file)
        browse_btn.pack(side=tk.LEFT)

        # Supported formats info
        info_label = ttk.Label(main_frame,
                               text="Supports: PDF, DOCX, PPTX, Images, HTML, and more",
                               font=('Helvetica', 9), foreground='gray')
        info_label.pack(pady=5)

        # Convert button
        self.convert_btn = ttk.Button(main_frame, text="Convert to Markdown",
                                       command=self.convert_file)
        self.convert_btn.pack(pady=20)

        # Progress bar
        self.progress = ttk.Progressbar(main_frame, mode='indeterminate', length=300)
        self.progress.pack(pady=10)

        # Status label
        self.status_var = tk.StringVar(value="Select a file to convert")
        self.status_label = ttk.Label(main_frame, textvariable=self.status_var)
        self.status_label.pack(pady=10)

    def browse_file(self):
        filetypes = [
            ("All supported", "*.pdf *.docx *.pptx *.xlsx *.html *.htm *.png *.jpg *.jpeg *.tiff *.bmp"),
            ("PDF files", "*.pdf"),
            ("Word documents", "*.docx"),
            ("PowerPoint", "*.pptx"),
            ("Excel", "*.xlsx"),
            ("HTML files", "*.html *.htm"),
            ("Images", "*.png *.jpg *.jpeg *.tiff *.bmp"),
            ("All files", "*.*")
        ]
        filename = filedialog.askopenfilename(filetypes=filetypes)
        if filename:
            self.file_path.set(filename)
            self.status_var.set("Ready to convert")

    def convert_file(self):
        input_path = self.file_path.get()

        if not input_path:
            messagebox.showwarning("No file selected", "Please select a file first.")
            return

        if not os.path.exists(input_path):
            messagebox.showerror("File not found", "The selected file does not exist.")
            return

        # Ask where to save
        output_path = filedialog.asksaveasfilename(
            defaultextension=".md",
            filetypes=[("Markdown files", "*.md")],
            initialfile=os.path.splitext(os.path.basename(input_path))[0] + ".md"
        )

        if not output_path:
            return

        # Start conversion in a thread
        self.convert_btn.config(state='disabled')
        self.progress.start(10)
        self.status_var.set("Converting... Please wait")

        thread = threading.Thread(target=self.do_conversion, args=(input_path, output_path))
        thread.start()

    def do_conversion(self, input_path, output_path):
        try:
            from docling.document_converter import DocumentConverter

            converter = DocumentConverter()
            result = converter.convert(input_path)
            markdown_content = result.document.export_to_markdown()

            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(markdown_content)

            self.root.after(0, lambda: self.conversion_complete(True, output_path))
        except Exception as e:
            self.root.after(0, lambda: self.conversion_complete(False, str(e)))

    def conversion_complete(self, success, message):
        self.progress.stop()
        self.convert_btn.config(state='normal')

        if success:
            self.status_var.set("Conversion complete!")
            messagebox.showinfo("Success", f"File converted successfully!\n\nSaved to:\n{message}")
        else:
            self.status_var.set("Conversion failed")
            messagebox.showerror("Error", f"Conversion failed:\n{message}")


def main():
    root = tk.Tk()
    app = DoclingConverterApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
