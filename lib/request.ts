
import http from 'http'
import https from 'https'
import url from 'url'
import parse from './parser'
import axios from 'axios'

interface Options {
	port?: number
	protocol?: string
	headers?: Record<string, any>
}

function request2(url: string, buffer: any, cb: any) {

	fetch(url, {
		method: 'POST',
		body: buffer.buffer,
		headers: {
			'Content-Type': 'application/ipp',
		}
	}).then(res => {
		console.log('STATUS', res.status)
		if (res.ok) {
			res.arrayBuffer().then(buffer => {
				const data = parse(Buffer.from(buffer))
				delete data.operation;
				cb(null, data)
			})
		} else {
			cb(new IppResponseError(res.status))
		}
	})

}

function request3(url: string, buffer: any, cb: any) {
	axios
		.post(url, buffer, {
			responseType: 'arraybuffer',
			headers: { 'Content-Type': 'application/ipp' }
		})
		.then((response:any) => {
			 cb(null, parse(Buffer.from(response.data)))
		});

}

function request(opts: any, buffer: any, cb: any) {
	var streamed = typeof buffer === "function";
	//All IPP requires are POSTs- so we must have some data.
	//  10 is just a number I picked- this probably should have something more meaningful
	if (!Buffer.isBuffer(buffer) || buffer.length < 10) {
		return cb(new Error("Data required"));
	}
	if (typeof opts === "string")
		opts = url.parse(opts);
	if (!opts.port) opts.port = 631;

	if (!opts.headers) opts.headers = {};
	opts.headers['Content-Type'] = 'application/ipp';
	opts.method = "POST";

	if (opts.protocol === "ipp:")
		opts.protocol = "http:";

	if (opts.protocol === "ipps:")
		opts.protocol = "https:";

	var req = (opts.protocol === "https:" ? https : http).request(opts, function (res) {
		//		console.log('STATUS: ' + res.statusCode);
		//		console.log('HEADERS: ' + JSON.stringify(res.headers));
		switch (res.statusCode) {
			case 100:
				if (opts.headers['Expect'] !== '100-Continue' || typeof opts.continue !== "function") {
					cb(new IppResponseError(res.statusCode));
				}
				return console.log("100 Continue");
			case 200:
				return readResponse(res, cb);
			default:
				cb(new IppResponseError(res.statusCode));
				return console.log(res.statusCode, "response");
		}
	});
	req.on('error', function (err) {
		cb(err);
	});
	if (opts.headers['Expect'] === '100-Continue' && typeof opts.continue === "function") {
		req.on('continue', function () {
			opts.continue(req);
		});
	}
	req.write(buffer);
	req.end();
};

function readResponse(res: any, cb: any) {
	var chunks: any[] = [], length = 0;
	res.on('data', function (chunk: any) {
		length += chunk.length;
		chunks.push(chunk);
	});
	res.on('end', function () {
		var response = parse(Buffer.concat(chunks, length));
		delete response.operation;
		cb(null, response);
	});
}

export default request3


class IppResponseError extends Error {
	name: string
	statusCode?: number
	message: string
	stack: string | undefined
	constructor(statusCode?: number, message?: string) {
		super()
		this.name = 'IppResponseError';
		this.statusCode = statusCode;
		this.message = message || 'Received unexpected response status ' + statusCode + ' from the printer';
		this.stack = (new Error()).stack;
	}

}
