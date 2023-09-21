
import { xref } from './lib/ipputil'
import parse from './lib/parser'
import serialize from './lib/serializer'
import request from './lib/request'
import Printer from './lib/printer'
import versions from './lib/versions'
import attributes from './lib/attributes'
import keywords from './lib/keywords'
import enums from './lib/enums'
import tags from './lib/tags'
import statusCodes from './lib/status-codes'

export default {
	parse: parse,
	serialize: serialize,
	request: request,
	Printer: Printer,
	versions: versions,
	attributes: attributes,
	keywords: keywords,
	enums: enums,
	tags: tags,
	statusCodes: statusCodes
}

export const operations = enums['operations-supported'];
export const attribute = {
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-7
	groups: xref(tags.lookup.slice(0x00, 0x0F)),
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-8
	values: xref(tags.lookup.slice(0x10, 0x1F)),
	//http://www.iana.org/assignments/ipp-registrations/ipp-registrations.xml#ipp-registrations-9
	syntaxes: xref(tags.lookup.slice(0x20))
}
