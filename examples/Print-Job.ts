import ipp from '../ipp'
import  PDFDocument from 'pdfkit'
import concat from 'concat-stream'
import { PRINTER_URL } from './config';

var doc = new PDFDocument({margin:5});


doc.pipe(concat(function (data:any) {
	var printer = new ipp.Printer(PRINTER_URL);
	var msg = {
		"operation-attributes-tag": {
			"requesting-user-name": "Bumblebee",
			"job-name": "whatever.pdf",
			"document-format": "application/pdf"
		},
		"job-attributes-tag":{
      "media-col": {
        "media-source": "tray-2"
      }
		}
		, data: data
	};
	printer.execute("Print-Job", msg, function(err:any, res:any){
		console.log(err);
		console.log(res);
	});
}));

doc.text("Hello World", 20,20);

doc.end();
