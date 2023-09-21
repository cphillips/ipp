

import enums from './enums'
import statusCodes from './status-codes'
import tags from './tags'
const RS = '\u001e'

const operations = enums['operations-supported']

//cphil: What kind of buffer is this?
export default function (buf: any) {
	var obj: Record<string, any> = {};
	var position = 0;
	var encoding = 'utf8';
	function read1(): number {
		return buf[position++];
	}
	function read2(): number {
		var val = buf.readInt16BE(position, true);
		position += 2;
		return val;
	}
	function read4(): number {
		var val = buf.readInt32BE(position, true);
		position += 4;
		return val;
	}
	function read(length: number, enc?: string): string {
		if (length == 0) return '';
		return buf.toString(enc ?? encoding, position, position += length);
	}
	function readGroups() {
		var group;
		while (position < buf.length && (group = read1()) !== 0x03) {//end-of-attributes-tag
			readGroup(group);
		}
	}
	function readGroup(group: string | number) {
		var name = tags.lookup[group];
		const _group = {};
		if (obj[name]) {
			if (!Array.isArray(obj[name]))
				obj[name] = [obj[name]];
			obj[name].push(_group);
		}
		else obj[name] = _group;

		while (buf[position] >= 0x0F) {// delimiters are between 0x00 to 0x0F
			readAttr(_group);
		}
	}
	function readAttr(group: Record<string, any>) {
		var tag = read1();
		//TODO: find a test for this
		if (tag === 0x7F) {//tags.extension
			tag = read4();
		}
		var name = read(read2());
		group[name] = readValues(tag, name)
	}
	function hasAdditionalValue() {
		var current = buf[position];
		return current !== 0x4A //tags.memberAttrName
			&& current !== 0x37 //tags.endCollection
			&& current !== 0x03 //tags.end-of-attributes-tag
			&& buf[position + 1] === 0x00 && buf[position + 2] === 0x00;
	}
	function readValues(type:number, name?:string) {
		let value = readValue(type, name)
		if (hasAdditionalValue()) {
			const values = [value];
			do {
				type = read1();
				read2();//empty name
				values.push(readValue(type, name));
			}
			while (hasAdditionalValue())
			return values
		} else {
			return value;
		}
	}

	function readValue(tag: any, name?: string): any {
		var length = read2();
		//http://tools.ietf.org/html/rfc2910#section-3.9
		switch (tag) {
			case tags.enum:
				var val = read4();
				if(name === undefined)
					throw new Error("enum value without name")
				return (enums[name] && enums[name].lookup[val]) || val;
			case tags.integer:
				return read4();

			case tags.boolean:
				return !!read1();

			case tags.rangeOfInteger:
				return [read4(), read4()];

			case tags.resolution:
				return [read4(), read4(), read1() === 0x03 ? 'dpi' : 'dpcm'];

			case tags.dateTime:
				// http://tools.ietf.org/html/rfc1903 page 17
				var date = new Date(read2(), read1(), read1(), read1(), read1(), read1(), read1());
				//silly way to add on the timezone
				//cphil: looks like a bug here read() is always a string and not a number
				return new Date(date.toISOString().substr(0, 23).replace('T', ',') + ',' + String.fromCharCode(read(1) as unknown as number) + read(1) + ':' + read(1));

			case tags.textWithLanguage:
			case tags.nameWithLanguage:
				var lang = read(read2());
				var subval = read(read2());
				return lang + RS + subval;

			case tags.nameWithoutLanguage:
			case tags.textWithoutLanguage:
			case tags.octetString:
			case tags.memberAttrName:
				return read(length);

			case tags.keyword:
			case tags.uri:
			case tags.uriScheme:
			case tags.charset:
			case tags.naturalLanguage:
			case tags.mimeMediaType:
				return read(length, 'ascii');

			case tags.begCollection:
				//the spec says a value could be present- but can be ignored
				read(length);
				return readCollection();

			case tags['no-value']:
			default:
				debugger;
				return module.exports.handleUnknownTag(tag, name, length, read)
		}
	}
	function readCollection() {
		var tag;
		var collection:Record<string,any> = {};

		while ((tag = read1()) !== 0x37) {//tags.endCollection
			if (tag !== 0x4A) {
				console.log("unexpected:", tags.lookup[tag]);
				return;
			}
			//read nametag name and discard it
			read(read2());
			var name = readValue(0x4A);
			var values = readCollectionItemValue();
			collection[name] = values;
		}
		//Read endCollection name & value and discard it.
		//The spec says that they MAY have contents in the
		// future- so we can't assume they are empty.
		read(read2());
		read(read2());

		return collection;
	}
	function readCollectionItemValue(name?: string) {
		var tag = read1();
		//TODO: find a test for this
		if (tag === 0x7F) {//tags.extension
			tag = read4();
		}
		//read valuetag name and discard it
		read(read2());

		return readValues(tag, name);
	}

	obj.version = read1() + '.' + read1();
	var bytes2and3 = read2();
	//byte[2] and byte[3] are used to define the 'operation' on
	//requests, but used to hold the statusCode on responses. We
	//can almost detect if it is a req or a res- but sadly, six
	//values overlap. In these cases, the parser will give both and
	//the consumer can ignore (or delete) whichever they don't want.
	if (bytes2and3 >= 0x02 || bytes2and3 <= 0x3D)
		obj.operation = operations.lookup[bytes2and3];

	if (bytes2and3 <= 0x0007 || bytes2and3 >= 0x0400)
		obj.statusCode = statusCodes.lookup[bytes2and3];
	obj.id = read4();
	readGroups();

	if (position < buf.length)
		obj.data = buf.toString(encoding, position);

	return obj;
};
module.exports.handleUnknownTag = function log(tag: any, name: string, length: number, read: any) {
	var value = length ? read(length) : undefined;
	console.log("The spec is not clear on how to handle tag " + tag + ": " + name + "=" + String(value) + ". " +
		"Please open a github issue to help find a solution!");
	return value;
};
