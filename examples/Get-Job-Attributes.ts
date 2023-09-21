import ipp from './../ipp'
import { PRINTER_URL } from './config'

var printer = new ipp.Printer(PRINTER_URL);
var msg = {
	"operation-attributes-tag": {
		'job-uri': 'ipp://CP01.local/ipp/printer/0186'
	}
};
function go() {
	printer.execute("Get-Job-Attributes", msg, function (err: any, res: any) {
		console.log(res);
		setTimeout(go, 0);
	});
}
go();