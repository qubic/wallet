import { Component, EventEmitter, Input, Output } from '@angular/core';



@Component({
  selector: 'app-file-selector',
  templateUrl: './file-selector.component.html',
  styleUrls: ['./file-selector.component.scss']
})
export class FileSelectorComponent {

  public selectedFile: File | undefined = undefined;

  @Input()
  public requredText: string = 'File required';

  @Input()
  public selectFileText: string = 'Select file';

  @Output()
  public fileSelected: EventEmitter<File> = new EventEmitter<File>();

  onFileSelected(event: any) {
    this.selectedFile = event?.target.files[0];
    if(this.selectFileText){
      this.fileSelected.emit(this.selectedFile!);
    }
  }

}
