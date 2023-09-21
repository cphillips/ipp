
/*
	Poll the printer for a limited set of attributes
*/

import ipp from './../ipp'
import { PRINTER_URL } from './config';
var id = 0x0123;//made up reqid

var printer = new ipp.Printer(PRINTER_URL);
var msg = {
	"operation-attributes-tag": {
		"document-format": "application/pdf",
		"requested-attributes": [
			"queued-job-count",
			"marker-levels",
			"printer-state",
			"printer-state-reasons",
			"printer-up-time"
		]
	}
};
function printer_info(){
	printer.execute("Get-Printer-Attributes", msg, function(err:any, res:any){
		console.log(JSON.stringify(res['printer-attributes-tag'], null, 2));
		setTimeout(printer_info, 1);
	});
}
printer_info();
