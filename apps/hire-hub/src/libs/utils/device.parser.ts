import * as UAParser from 'ua-parser-js';

export class DeviceParser {
	static parseUserAgent(userAgent: string) {
		const parser = new UAParser.UAParser(userAgent);
		const result = parser.getResult();

		return {
			browser: `${result.browser.name || 'Unknown'} ${result.browser.version || ''}`.trim(),
			os: `${result.os.name || 'Unknown'} ${result.os.version || ''}`.trim(),
			deviceType: this.getDeviceType(result),
			deviceName: this.getDeviceName(result),
		};
	}

	private static getDeviceType(result: UAParser.IResult): string {
		if (result.device.type) return result.device.type;
		if (result.os.name?.includes('iOS') || result.os.name?.includes('Android')) {
			return 'mobile';
		}
		return 'desktop';
	}

	private static getDeviceName(result: UAParser.IResult): string {
		const parts: string[] = [];
		if (result.device.vendor) parts.push(result.device.vendor);
		if (result.device.model) parts.push(result.device.model);
		if (parts.length === 0) {
			parts.push(result.browser.name || 'Unknown Browser');
			if (result.os.name) parts.push(`on ${result.os.name}`);
		}
		return parts.join(' ');
	}
}
