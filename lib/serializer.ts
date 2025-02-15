import { ArrayWithLookup } from "./arrays";

// import enum from './enums'
// 	tags = require('./tags'),
// 	versions = require('./versions'),
// 	attributes = require('./attributes'),
// 	enums = require('./enums'),
// 	keywords = require('./keywords'),
// 	statusCodes = require('./status-codes'),

import versions from './versions'
import attributes from './attributes'
import keywords from './keywords'
import enums from './enums'
import tags from './tags'
import statusCodes from './status-codes'


const	RS = '\u001e'
const operations = enums['operations-supported']

function random(){
	return +Math.random().toString().substr(-8);
}

export default function serialize(msg:any){
	var buf = Buffer.alloc(10240)
	var position = 0;
	function write1(val:number){
		checkBufferSize(1);
		buf.writeUInt8(val, position);
		position+=1;
	}
	function write2(val:number){
		checkBufferSize(2);
		buf.writeUInt16BE(val, position);
		position+=2;
	}
	function write4(val:number){
		checkBufferSize(4);
		buf.writeUInt32BE(val, position);
		position+=4;
	}
	function writeStr(str:string, enc?:BufferEncoding){
		var length = Buffer.byteLength(str);
		checkBufferSize(length);
		buf.write(str, position, length, enc ?? "utf8");
		position+=length;
	}
	function write(str:string, enc?:BufferEncoding){
		var length = Buffer.byteLength(str);
		write2(length);
		checkBufferSize(length);
		buf.write(str, position, length, enc ?? "utf8");
		position+=length;
	}
	function checkBufferSize(length:number){
		if (position + length > buf.length){
			buf = Buffer.concat([buf], 2 * buf.length);
		}
	}
	var special:Record<string,number> = {'attributes-charset':1, 'attributes-natural-language':2};
	var groupmap:Record<string,string|string[]> = {
		"job-attributes-tag":	               ['Job Template', 'Job Description'],
		'operation-attributes-tag':          'Operation',
		'printer-attributes-tag':            'Printer Description',
		"unsupported-attributes-tag":        '',//??
		"subscription-attributes-tag":       'Subscription Description',
		"event-notification-attributes-tag": 'Event Notifications',
		"resource-attributes-tag":           '',//??
		"document-attributes-tag":           'Document Description'
	};
	function writeGroup(tag:string){
		var attrs = msg[tag];
		if(!attrs) return;
		var keys = Object.keys(attrs);
		//'attributes-charset' and 'attributes-natural-language' need to come first- so we sort them to the front
		if(tag==tags['operation-attributes-tag'])
			keys = keys.sort(function(a,b){ return (special[a]||3)-(special[b]||3); });
		var groupname = groupmap[tag];
		write1(tags[tag]);
		keys.forEach(function(name){
			attr(groupname, name, attrs);
		});
	}
	function attr(group:any, name:string, obj:any){
		var groupName = Array.isArray(group)
			? group.find( function (grp) { return attributes[grp][name] })
			: group;
		if(!groupName) throw "Unknown attribute: " + name;

		//cphillips: dangerous assumming
		var syntax = attributes[groupName][name] as ArrayWithLookup<any>;

		if(!syntax) throw "Unknown attribute: " + name;

		var value = obj[name];
		if(!Array.isArray(value))
			value = [value];

		value.forEach(function(value:number, i:number){
			//we need to re-evaluate the alternates every time
			var syntax2 = Array.isArray(syntax)? resolveAlternates(syntax, name, value) : syntax;
			var tag = getTag(syntax2, name, value);
			if(tag===tags.enum)
				value = enums[name][value];

			write1(tag);
			if(i==0){
				write(name);
			}
			else {
				write2(0x0000);//empty name
			}

			writeValue(tag, value, syntax2.members);
		});
	}
	function getTag(syntax:any, name:string, value:any){
		var tag = syntax.tag;
		if(!tag){
			var hasRS = !!~value.indexOf(RS);
			tag = tags[syntax.type+(hasRS?'With':'Without')+'Language'];
		}
		return tag;
	}

	function resolveAlternates(array:ArrayWithLookup<any>, name:string, value:any){
		switch(array.alts){
			case 'keyword,name':
			case 'keyword,name,novalue':
				if(value===null && array.lookup['novalue']) return array.lookup['novalue'];
				return ~keywords[name].indexOf(value)? array.lookup.keyword : array.lookup.name;
			case 'integer,rangeOfInteger':
				return Array.isArray(value)? array.lookup.rangeOfInteger : array.lookup.integer;
			case 'dateTime,novalue':
				return !isNaN(Date.parse(value))? array.lookup.dateTime : array.lookup['novalue'];
			case 'integer,novalue':
				return !isNaN(value)? array.lookup.integer : array.lookup['novalue'];
			case 'name,novalue':
				return value!==null? array.lookup.name : array.lookup['novalue'];
			case 'novalue,uri':
				return value!==null? array.lookup.uri : array.lookup['novalue'];
			case 'enumeration,unknown':
				return enums[name][value]? array.lookup['enumeration'] : array.lookup.unknown;
			case 'enumeration,novalue':
				return value!==null? array.lookup['enumeration'] : array.lookup['novalue'];
			case 'collection,novalue':
				return value!==null? array.lookup['enumeration'] : array.lookup['novalue'];
			default:
				throw "Unknown atlernates";
		}
	}
	function writeValue(tag:any, value:any, submembers?:any){
		switch(tag){
			case tags.enum:
				write2(0x0004);
				return write4(value);
			case tags.integer:
				write2(0x0004);
				return write4(value);

			case tags.boolean:
				write2(0x0001);
				return write1(Number(value));

			case tags.rangeOfInteger:
				write2(0x0008);
				write4(value.min);
				write4(value.max);
				return;

			case tags.resolution:
				write2(0x0009);
				write4(value[0]);
				write4(value[1]);
				write1(value[2]==='dpi'? 0x03 : 0x04);
				return;

			case tags.dateTime:
				write2(0x000B);
				write2(value.getFullYear());
				write1(value.getMonth() + 1);
				write1(value.getDate());
				write1(value.getHours());
				write1(value.getMinutes());
				write1(value.getSeconds());
				write1(Math.floor(value.getMilliseconds() / 100));
				var tz = timezone(value);
				writeStr(tz[0]);// + or -
				write1(tz[1]);//hours
				write1(tz[2]);//minutes
				return;

			case tags.textWithLanguage:
			case tags.nameWithLanguage:
				//cphillips: parts does not exist
				// write2(parts[0].length);
				// write2(parts[0]);
				// write2(parts[1].length);
				// write2(parts[1]);
				return;

			case tags.nameWithoutLanguage:
			case tags.textWithoutLanguage:
			case tags.octetString:
			case tags.memberAttrName:
				return write(value);

			case tags.keyword:
			case tags.uri:
			case tags.uriScheme:
			case tags.charset:
			case tags.naturalLanguage:
			case tags.mimeMediaType:
				return write(value, 'ascii');

			case tags.begCollection:
				write2(0);//empty value
				return writeCollection(value, submembers);

			case tags["no-value"]:
				//empty value? I can't find where this is defined in any spec.
				return write2(0);

			default:
				debugger;
				console.error(tag, "not handled");
		}
	}
	function writeCollection(value:any, members:any){
		Object.keys(value).forEach(function(key){
			var subvalue = value[key];
			//cphil: dangerously assuming 
			var subsyntax = members[key] as ArrayWithLookup<any>;

			if(Array.isArray(subsyntax))
				subsyntax = resolveAlternates(subsyntax, key, subvalue);

			var tag = getTag(subsyntax, key, subvalue);
			if(tag===tags.enum)
				subvalue = enums[key][subvalue];

			write1(tags.memberAttrName)
			write2(0)//empty name
			writeValue(tags.memberAttrName, key);
			write1(tag)
			write2(0)//empty name
			writeValue(tag, subvalue, subsyntax.members);
		});
		write1(tags.endCollection)
		write2(0)//empty name
		write2(0)//empty value
	}

	write2(versions[msg.version||'2.0']);
	write2(msg.operation? operations[msg.operation] : statusCodes[msg.statusCode]);
	write4(msg.id||random());//request-id

	writeGroup('operation-attributes-tag');
	writeGroup('job-attributes-tag');
	writeGroup('printer-attributes-tag');
	writeGroup('document-attributes-tag');
	//TODO... add the others

	write1(0x03);//end


	if(!msg.data)
		return buf.slice(0, position);

	if(!Buffer.isBuffer(msg.data))
		throw "data must be a Buffer"

	var buf2 = new Buffer(position + msg.data.length);
	buf.copy(buf2, 0, 0, position);
	msg.data.copy(buf2, position, 0);
	return buf2;
};
function timezone(d:Date):[string,number,number] {
	var z = d.getTimezoneOffset();
	return [
		z > 0 ? "-" : "+",
		~~(Math.abs(z) / 60),
		Math.abs(z) % 60
	];
}
