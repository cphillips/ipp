import ipp from './../ipp'
import { PRINTER_URL } from './config';
var id = 0x0123;//made up reqid

var printer = new ipp.Printer(PRINTER_URL);
var msg = {
	"operation-attributes-tag": {
		"requesting-user-name": "William",
		"message": "These are not the droids you are looking for"
	}
};
printer.execute("Identify-Printer", msg, function(err:any, res:any){
	console.log(res);
});
