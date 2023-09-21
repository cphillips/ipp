import ipp from './../ipp'
import PDFDocument  from 'pdfkit';
import { PRINTER_URL } from './config';

//make a PDF document
var doc = new PDFDocument({margin:0});
doc.text(".", 0, 0);
//doc.addPage();
//doc.text(".", 0, 0);


var printer = new ipp.Printer(PRINTER_URL);
var msg = {
	"operation-attributes-tag": {
		"requesting-user-name": "William",
		"job-name": "My Test Job",
		"document-format": "application/pdf",
		"document-uri": "http://192.168.20.114:5000/check"
	}
};
printer.execute("Print-URI", msg, function(err:any, res:any){
	console.log(res);
});
