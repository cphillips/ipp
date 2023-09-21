import ipp from './../ipp'
import { PRINTER_URL } from './config';
var printer = new ipp.Printer(PRINTER_URL);

var msg = {
  "operation-attributes-tag": {
   //use these to view completed jobs...
//	"limit": 10,
   "which-jobs": "completed",

    "requested-attributes": [
      "job-id",
      "job-uri",
      "job-state",
      "job-state-reasons",
      "job-name",
      "job-originating-user-name",
      "job-media-sheets-completed"
    ]
  }
}

printer.execute("Get-Jobs", msg, function(err:any, res:any){

  if (err) return console.log(err);
  console.log(res);
});
