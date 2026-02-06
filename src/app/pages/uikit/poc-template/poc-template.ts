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
    imports: [
        CommonModule,
        FormsModule,
        EditorModule,
        ButtonModule,
        MessageModule,
        TabsModule,
        TooltipModule,
        InputTextModule
    ],
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
    <p style="text-align: center;">(.......................................)</p>
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

    constructor(private sanitizer: DomSanitizer) { }

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
        // console.log('Updating preview with editor data:', this.editorData);
        // แทนที่ตัวแปรด้วยค่าจริงเฉยๆ ไม่มี highlight
        Object.keys(this.exampleValues).forEach((key) => {
            const regex = new RegExp(`{{${key}}}`, 'g');
            preview = preview.replace(regex, this.exampleValues[key]);
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

    // ฟังก์ชันแปลง Quill classes เป็น inline styles
    private convertQuillToInlineStyles(element: HTMLElement): HTMLElement {
        const cloned = element.cloneNode(true) as HTMLElement;

        const processElement = (el: Element) => {
            if (el instanceof HTMLElement) {
                const computed = window.getComputedStyle(el);

                // แปลง Quill alignment classes
                if (el.classList.contains('ql-align-center')) {
                    el.style.textAlign = 'center';
                } else if (el.classList.contains('ql-align-right')) {
                    el.style.textAlign = 'right';
                } else if (el.classList.contains('ql-align-justify')) {
                    el.style.textAlign = 'justify';
                }

                // แปลง Quill indent
                if (el.classList.contains('ql-indent-1')) {
                    el.style.paddingLeft = '3em';
                } else if (el.classList.contains('ql-indent-2')) {
                    el.style.paddingLeft = '6em';
                }

                // คัดลอก computed styles ที่สำคัญ
                const importantStyles = [
                    'text-align',
                    'text-indent',
                    'font-weight',
                    'font-style',
                    'font-size',
                    'font-family',
                    'color',
                    'background-color',
                    'padding-left',
                    'padding-right',
                    'padding-top',
                    'padding-bottom',
                    'margin-bottom',
                    'line-height',
                    'text-decoration'
                ];

                importantStyles.forEach(prop => {
                    const value = computed.getPropertyValue(prop);
                    if (value &&
                        value !== 'none' &&
                        value !== 'normal' &&
                        value !== 'auto' &&
                        value !== 'rgba(0, 0, 0, 0)' &&
                        value !== 'transparent') {
                        el.style.setProperty(prop, value);
                    }
                });

                // บังคับ styles เฉพาะ tags
                if (el.tagName === 'P') {
                    if (!el.style.lineHeight) el.style.lineHeight = '1.8';
                    if (!el.style.marginBottom) el.style.marginBottom = '1em';
                    if (!el.style.color || el.style.color === 'rgb(0, 0, 0)') {
                        el.style.color = '#000000';
                    }
                }

                if (el.tagName === 'STRONG') {
                    el.style.fontWeight = 'bold';
                    if (!el.style.color) el.style.color = '#000000';
                }

                if (el.tagName.match(/^H[1-6]$/)) {
                    el.style.marginTop = '1.5rem';
                    el.style.marginBottom = '1rem';
                    el.style.fontWeight = 'bold';
                    if (!el.style.color) el.style.color = '#000000';
                }

                // บังคับลบ background ที่ไม่ต้องการ
                if (el.tagName === 'SPAN' && !el.style.backgroundColor) {
                    el.style.backgroundColor = 'transparent';
                }
            }

            // Process children recursively
            Array.from(el.children).forEach(child => processElement(child));
        };

        processElement(cloned);
        return cloned;
    }

    async generatePDF() {
        this.isGeneratingPDF = true;
        this.showPreview = true;
        this.updatePreview();

        setTimeout(async () => {
            try {
                const element = this.pdfPreviewElement.nativeElement;

                // Clone และแปลง styles
                const clonedElement = element.cloneNode(true) as HTMLElement;

                // แปลง computed styles เป็น inline styles ทั้งหมด
                const copyStyles = (source: Element, target: Element) => {
                    if (source instanceof HTMLElement && target instanceof HTMLElement) {
                        const computed = window.getComputedStyle(source);

                        // คัดลอกทุก style ที่สำคัญ
                        const stylesToCopy = [
                            'font-family', 'font-size', 'font-weight', 'font-style',
                            'color', 'background-color',
                            'text-align', 'text-indent', 'text-decoration',
                            'line-height', 'letter-spacing',
                            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                            'border', 'border-radius',
                            'width', 'height',
                            'display', 'vertical-align'
                        ];

                        stylesToCopy.forEach(prop => {
                            const value = computed.getPropertyValue(prop);
                            if (value && value !== 'none' && value !== 'normal') {
                                target.style.setProperty(prop, value, 'important');
                            }
                        });

                        // แปลง Quill classes เป็น inline styles
                        if (target.classList.contains('ql-align-center')) {
                            target.style.setProperty('text-align', 'center', 'important');
                        }
                        if (target.classList.contains('ql-align-right')) {
                            target.style.setProperty('text-align', 'right', 'important');
                        }
                        if (target.classList.contains('ql-align-justify')) {
                            target.style.setProperty('text-align', 'justify', 'important');
                        }
                        if (target.classList.contains('ql-indent-1')) {
                            target.style.setProperty('padding-left', '3em', 'important');
                        }
                        if (target.classList.contains('ql-indent-2')) {
                            target.style.setProperty('padding-left', '6em', 'important');
                        }

                        // บังคับสีดำสำหรับข้อความ
                        if (!target.style.color || target.style.color === 'rgb(0, 0, 0)') {
                            target.style.setProperty('color', '#000000', 'important');
                        }
                    }

                    // Recursive สำหรับ children
                    Array.from(source.children).forEach((child, index) => {
                        if (target.children[index]) {
                            copyStyles(child, target.children[index]);
                        }
                    });
                };

                copyStyles(element, clonedElement);

                // สร้าง temp container
                const tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                position: fixed;
                left: -99999px;
                top: 0;
                width: 210mm;
                background: #ffffff;
                padding: 25mm 20mm;
                font-family: 'Sarabun', 'Sukhumvit Set', sans-serif;
                font-size: 14px;
                line-height: 1.8;
                color: #000000;
            `;
                tempContainer.appendChild(clonedElement);
                document.body.appendChild(tempContainer);

                // รอให้ render
                await new Promise(resolve => setTimeout(resolve, 500));

                // สร้าง canvas
                const canvas = await html2canvas(clonedElement, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width: clonedElement.scrollWidth,
                    height: clonedElement.scrollHeight,
                    windowWidth: clonedElement.scrollWidth,
                    windowHeight: clonedElement.scrollHeight
                });

                // ลบ temp container
                document.body.removeChild(tempContainer);

                // สร้าง PDF
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    compress: true
                });

                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                let heightLeft = imgHeight;
                let position = 0;

                // หน้าแรก
                pdf.addImage(
                    canvas.toDataURL('image/jpeg', 0.95),
                    'JPEG',
                    0,
                    position,
                    imgWidth,
                    imgHeight
                );
                heightLeft -= pageHeight;

                // หน้าถัดไป (ถ้ามี)
                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    pdf.addPage();
                    pdf.addImage(
                        canvas.toDataURL('image/jpeg', 0.95),
                        'JPEG',
                        0,
                        position,
                        imgWidth,
                        imgHeight
                    );
                    heightLeft -= pageHeight;
                }

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
                const clonedElement = element.cloneNode(true) as HTMLElement;

                // ใช้ฟังก์ชัน copyStyles เหมือนกับ generatePDF
                const copyStyles = (source: Element, target: Element) => {
                    if (source instanceof HTMLElement && target instanceof HTMLElement) {
                        const computed = window.getComputedStyle(source);

                        const stylesToCopy = [
                            'font-family', 'font-size', 'font-weight', 'font-style',
                            'color', 'background-color',
                            'text-align', 'text-indent', 'text-decoration',
                            'line-height', 'letter-spacing',
                            'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
                            'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
                            'border', 'border-radius',
                            'width', 'height',
                            'display', 'vertical-align'
                        ];

                        stylesToCopy.forEach(prop => {
                            const value = computed.getPropertyValue(prop);
                            if (value && value !== 'none' && value !== 'normal') {
                                target.style.setProperty(prop, value, 'important');
                            }
                        });

                        if (target.classList.contains('ql-align-center')) {
                            target.style.setProperty('text-align', 'center', 'important');
                        }
                        if (target.classList.contains('ql-align-right')) {
                            target.style.setProperty('text-align', 'right', 'important');
                        }
                        if (target.classList.contains('ql-align-justify')) {
                            target.style.setProperty('text-align', 'justify', 'important');
                        }
                        if (target.classList.contains('ql-indent-1')) {
                            target.style.setProperty('padding-left', '3em', 'important');
                        }
                        if (target.classList.contains('ql-indent-2')) {
                            target.style.setProperty('padding-left', '6em', 'important');
                        }

                        if (!target.style.color || target.style.color === 'rgb(0, 0, 0)') {
                            target.style.setProperty('color', '#000000', 'important');
                        }
                    }

                    Array.from(source.children).forEach((child, index) => {
                        if (target.children[index]) {
                            copyStyles(child, target.children[index]);
                        }
                    });
                };

                copyStyles(element, clonedElement);

                const tempContainer = document.createElement('div');
                tempContainer.style.cssText = `
                position: fixed;
                left: -99999px;
                top: 0;
                width: 210mm;
                background: #ffffff;
                padding: 25mm 20mm;
                font-family: 'Sarabun', 'Sukhumvit Set', sans-serif;
                font-size: 14px;
                line-height: 1.8;
                color: #000000;
            `;
                tempContainer.appendChild(clonedElement);
                document.body.appendChild(tempContainer);

                await new Promise(resolve => setTimeout(resolve, 500));

                const canvas = await html2canvas(clonedElement, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    logging: false,
                    width: clonedElement.scrollWidth,
                    height: clonedElement.scrollHeight,
                    windowWidth: clonedElement.scrollWidth,
                    windowHeight: clonedElement.scrollHeight
                });

                document.body.removeChild(tempContainer);

                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    compress: true
                });

                const imgWidth = 210;
                const pageHeight = 297;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
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

                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
                const filename = `เอกสาร_${timestamp}.pdf`;
                pdf.save(filename);

                alert('✅ ดาวน์โหลด PDF สำเร็จ!');
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
            } catch (error) {
                alert('❌ ไม่สามารถโหลดเทมเพลตได้');
            }
        } else {
            alert('❌ ไม่พบเทมเพลตที่บันทึกไว้');
        }
    }

    resetTemplate() {
        if (confirm('⚠️ ต้องการรีเซ็ตเทมเพลตหรือไม่?\n\nการเปลี่ยนแปลงที่ยังไม่ได้บันทึกจะหายไป')) {
            this.editorData = '<h2 style="text-align: center;">เทมเพลตเอกสาร</h2><p>เริ่มต้นสร้างเทมเพลตของคุณที่นี่...</p>';
            this.updatePreview();
            this.pdfUrl = null;
            this.showPreview = false;
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