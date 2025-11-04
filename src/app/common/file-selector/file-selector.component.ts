import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';

let nextUniqueId = 0;

@Component({
  selector: 'app-file-selector',
  templateUrl: './file-selector.component.html',
  styleUrls: ['./file-selector.component.scss']
})
export class FileSelectorComponent {
  @Input() requredText: string = 'File required';
  @Input() selectFileText: string = 'Select file';
  @Output() fileSelected = new EventEmitter<File>();

  selectedFile: File | undefined = undefined;
  isDragOver = false;
  uniqueId: string = `input-file-id-${nextUniqueId++}`;

  @HostListener('dragover', ['$event'])
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  @HostListener('dragleave', ['$event'])
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  @HostListener('drop', ['$event'])
  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.onFileSelected({ target: { files: [file] } });
    }
  }

  onFileSelected(event: any) {
    const file = event?.target?.files[0];
    if (file) {
      this.selectedFile = file;
      this.fileSelected.emit(file);
    }
  }
}