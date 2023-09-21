import ipp from './../ipp'
import { PRINTER_URL } from './config';
var id = 0x0123;//made up reqid

var printer = new ipp.Printer(PRINTER_URL);
printer.execute("Get-Printer-Attributes", null, function(err:any, res:any){
	console.log(res);
});
