import { Component, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EditorModule } from 'primeng/editor';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { TabsModule } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';

interface TemplateVariable {
    key: string;
    label: string;
    category: string;
    exampleValue: string;
}

@Component({
    selector: 'app-poc-template',
    standalone: true,
    imports: [CommonModule, FormsModule, EditorModule, ButtonModule, MessageModule, TabsModule, TooltipModule, InputTextModule],
    templateUrl: './poc-template.html',
    styleUrl: './poc-template.scss'
})
export class PocTemplate {
    @ViewChild('pdfPreview') pdfPreviewElement!: ElementRef;

    public editorData = `
    <h2 style="text-align: center;">หนังสือรับรองการทำงาน</h2>
    <p style="text-align: right;">วันที่ {{current_date}}</p>
    <br/>
    <p style="text-indent: 2em;">ข้าพเจ้า บริษัท {{company_name}} ตั้งอยู่เลขที่ {{company_address}} ขอรับรองว่า</p>
    <br/>
    <p style="text-indent: 2em;"><strong>นาย/นาง/นางสาว {{employee_name}}</strong> รหัสพนักงาน <strong>{{employee_id}}</strong> ตำแหน่ง <strong>{{employee_position}}</strong> สังกัด{{employee_department}} ได้เข้าทำงานกับบริษัทฯ ตั้งแต่วันที่ {{start_date}} จนถึงปัจจุบัน โดยได้รับเงินเดือน <strong>{{salary}}</strong> บาทต่อเดือน</p>
    <br/>
    <p style="text-indent: 2em;">จึงเรียนมาเพื่อโปรดทราบ</p>
    <br/><br/><br/>
    <p style="text-align: center;">ลงชื่อ .......................................</p>
    <p style="text-align: center;">(.......................................</p>
    <p style="text-align: center;">ผู้มีอำนาจลงนาม</p>
    <p style="text-align: center;">บริษัท {{company_name}}</p>
  `;

    public previewData = '';
    public showPreview = false;
    public pdfUrl: SafeResourceUrl | null = null;
    public isGeneratingPDF = false;

    public variables: TemplateVariable[] = [
        { key: 'employee_name', label: 'ชื่อพนักงาน', category: 'ข้อมูลพนักงาน', exampleValue: 'สมชาย ใจดี' },
        { key: 'employee_id', label: 'รหัสพนักงาน', category: 'ข้อมูลพนักงาน', exampleValue: 'EMP001' },
        { key: 'employee_position', label: 'ตำแหน่ง', category: 'ข้อมูลพนักงาน', exampleValue: 'วิศวกรซอฟต์แวร์' },
        { key: 'employee_department', label: 'แผนก', category: 'ข้อมูลพนักงาน', exampleValue: 'แผนกพัฒนาระบบ' },
        { key: 'salary', label: 'เงินเดือน', category: 'ข้อมูลพนักงาน', exampleValue: '45,000' },
        { key: 'start_date', label: 'วันเริ่มงาน', category: 'ข้อมูลพนักงาน', exampleValue: '1 มกราคม 2026' },
        { key: 'company_name', label: 'ชื่อบริษัท', category: 'ข้อมูลบริษัท', exampleValue: 'บริษัท เทคโนโลยี จำกัด' },
        { key: 'company_address', label: 'ที่อยู่บริษัท', category: 'ข้อมูลบริษัท', exampleValue: '123 ถนนสุขุมวิท กรุงเทพฯ 10110' },
        { key: 'current_date', label: 'วันที่ปัจจุบัน', category: 'ข้อมูลทั่วไป', exampleValue: '5 กุมภาพันธ์ 2026' },
        { key: 'current_year', label: 'ปีปัจจุบัน', category: 'ข้อมูลทั่วไป', exampleValue: '2026' }
    ];

    public groupedVariables: { [key: string]: TemplateVariable[] } = {};
    public selectedCategory = '';
    public exampleValues: { [key: string]: string } = {};
    variable_name: any;

    constructor(private sanitizer: DomSanitizer) {}

    ngOnInit() {
        this.variables.forEach((variable) => {
            if (!this.groupedVariables[variable.category]) {
                this.groupedVariables[variable.category] = [];
            }
            this.groupedVariables[variable.category].push(variable);
            this.exampleValues[variable.key] = variable.exampleValue;
        });

        this.selectedCategory = Object.keys(this.groupedVariables)[0];
        this.updatePreview();
    }

    insertVariable(variableKey: string) {
        const placeholder = `{{${variableKey}}}`;
        this.editorData = this.editorData.trim() + ' ' + placeholder + ' ';
        this.updatePreview();
    }

    updatePreview() {
        let preview = this.editorData;

        Object.keys(this.exampleValues).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            preview = preview.replace(regex, `<span class="variable-highlight">${this.exampleValues[key]}</span>`);
        });

        this.previewData = preview;
    }

    togglePreview() {
        this.showPreview = !this.showPreview;
        if (this.showPreview) {
            this.updatePreview();
            this.pdfUrl = null;
        }
    }

    async generatePDF() {
        this.isGeneratingPDF = true;
        this.showPreview = true;
        this.updatePreview();

        // รอให้ DOM update
        setTimeout(async () => {
            try {
                const element = this.pdfPreviewElement.nativeElement;

                // ใช้ html2canvas-pro ที่รองรับ modern CSS
                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                    windowWidth: element.scrollWidth,
                    windowHeight: element.scrollHeight,
                    onclone: (clonedDoc: Document) => {
                        // ปรับแต่ง cloned document ก่อน render
                        const clonedElement = clonedDoc.querySelector('.document-preview');
                        if (clonedElement) {
                            (clonedElement as HTMLElement).style.boxShadow = 'none';
                        }
                    }
                });

                // สร้าง PDF
                const imgWidth = 210; // A4 width in mm
                const pageHeight = 297; // A4 height in mm
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                const pdf = new jsPDF('p', 'mm', 'a4');
                let heightLeft = imgHeight;
                let position = 0;

                // หน้าแรก
                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                // หน้าถัดไป (ถ้ามี)
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                // สร้าง URL สำหรับแสดง PDF
                const pdfBlob = pdf.output('blob');
                const pdfBlobUrl = URL.createObjectURL(pdfBlob);
                this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfBlobUrl);

                this.isGeneratingPDF = false;
                console.log('✅ สร้าง PDF สำเร็จ');
            } catch (error) {
                console.error('❌ Error generating PDF:', error);
                alert('เกิดข้อผิดพลาดในการสร้าง PDF: ' + (error as Error).message);
                this.isGeneratingPDF = false;
            }
        }, 500);
    }

    async downloadPDF() {
        if (!this.showPreview) {
            this.showPreview = true;
            this.updatePreview();
        }

        setTimeout(async () => {
            try {
                const element = this.pdfPreviewElement.nativeElement;

                const canvas = await html2canvas(element, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                    onclone: (clonedDoc: Document) => {
                        const clonedElement = clonedDoc.querySelector('.document-preview');
                        if (clonedElement) {
                            (clonedElement as HTMLElement).style.boxShadow = 'none';
                        }
                    }
                });

                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                const pdf = new jsPDF('p', 'mm', 'a4');
                let heightLeft = imgHeight;
                let position = 0;

                pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                // ดาวน์โหลด
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `เอกสาร_${timestamp}.pdf`;
                pdf.save(filename);

                alert('✅ ดาวน์โหลด PDF สำเร็จ!');
                console.log('✅ Downloaded:', filename);
            } catch (error) {
                console.error('❌ Error downloading PDF:', error);
                alert('เกิดข้อผิดพลาดในการดาวน์โหลด PDF: ' + (error as Error).message);
            }
        }, 500);
    }

    saveTemplate() {
        const template = {
            content: this.editorData,
            variables: this.exampleValues,
            createdAt: new Date().toISOString()
        };

        localStorage.setItem('documentTemplate', JSON.stringify(template));
        alert('✅ บันทึกเทมเพลตสำเร็จ!');
        console.log('💾 Saved template:', template);
    }

    loadTemplate() {
        const saved = localStorage.getItem('documentTemplate');
        if (saved) {
            try {
                const template = JSON.parse(saved);
                this.editorData = template.content;
                this.exampleValues = template.variables;
                this.updatePreview();
                alert('✅ โหลดเทมเพลตสำเร็จ!');
                console.log('📂 Loaded template:', template);
            } catch (error) {
                alert('❌ ไม่สามารถโหลดเทมเพลตได้ กรุณาลองใหม่');
                console.error('Error loading template:', error);
            }
        } else {
            alert('❌ ไม่พบเทมเพลตที่บันทึกไว้');
        }
    }

    resetTemplate() {
        if (confirm('⚠️ ต้องการรีเซ็ตเทมเพลตหรือไม่?\n\nการเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป')) {
            this.editorData = `
                <h2 style="text-align: center;">เทมเพลตเอกสาร</h2>
                <p>เริ่มต้นสร้างเทมเพลตของคุณที่นี่...</p>
                <p>คลิกตัวแปรจากด้านซ้ายเพื่อแทรกข้อมูล</p>
            `;
            this.updatePreview();
            this.pdfUrl = null;
            this.showPreview = false;
            console.log('🔄 Template reset');
        }
    }

    getCategories(): string[] {
        return Object.keys(this.groupedVariables);
    }

    getVariablesByCategory(category: string): TemplateVariable[] {
        return this.groupedVariables[category] || [];
    }

    closePDFViewer() {
        if (this.pdfUrl) {
            // Revoke object URL to free memory
            const url = (this.pdfUrl as any).changingThisBreaksApplicationSecurity;
            if (url) {
                URL.revokeObjectURL(url);
            }
        }
        this.pdfUrl = null;
    }

    onEditorTextChange() {
        this.updatePreview();
    }
}
