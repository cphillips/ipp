
import request from './request'
import serialize from './serializer'
import { extend } from './ipputil'


export default class Printer {
	url: URL
	version: string
	uri: string
	charset: string
	language: string
	constructor(url: string, opts?: any) {
		opts = opts || {};
		this.url = typeof url === "string" ? new URL(url) : url;
		this.version = opts.version || '2.0';
		this.uri = opts.uri || 'ipp://' + this.url.host + this.url.pathname;//cphil: was url.path
		this.charset = opts.charset || 'utf-8';
		this.language = opts.language || 'en-us';
	}

	_message(operation?: string, msg?: any) {
		if (typeof operation === "undefined")
			operation = 'Get-Printer-Attributes'

		var base: Record<string, any> = {
			version: this.version,
			operation: operation,
			id: null,//will get added by serializer if one isn't given
			'operation-attributes-tag': {
				//these are required to be in this order
				'attributes-charset': this.charset,
				'attributes-natural-language': this.language,
				'printer-uri': this.uri
			}
		};
		//these are required to be in this order
		if (msg && msg['operation-attributes-tag']['job-id'])
			base['operation-attributes-tag']['job-id'] = msg['operation-attributes-tag']['job-id'];
		//yes, this gets done in extend()- however, by doing this now, we define the position in the result object.
		else if (msg && msg['operation-attributes-tag']['job-uri'])
			base['operation-attributes-tag']['job-uri'] = msg['operation-attributes-tag']['job-uri'];

		msg = extend(base, msg);
		if (msg['operation-attributes-tag']['job-uri'])
			delete msg['operation-attributes-tag']['printer-uri'];
		return msg;
	}
	execute(operation: string, msg: any, cb: any) {
		msg = this._message(operation, msg);
		var buf = serialize(msg);
		//		console.log(buf.toString('hex'));
		//		console.log(JSON.stringify(
		//			require('./parser')(buf), null, 2
		//		));
		request(this.url, buf, cb);
	}
}


