import axios from 'axios';

interface DeviceInfo {
    device: string;
    browser: string;
    os: string;
}

interface LocationInfo {
    city: string;
    continent: string;
    country: string;
    countryCode: string; // Changed from country_code to match camelCase preference
    currency: string;
    timezone: string;
    ip: string;
    success: boolean;
    error?: string;
}

export const detectDevice = (userAgent: string): DeviceInfo => {
    const ua = userAgent.toLowerCase();

    // Device Detection
    let device = 'Desktop';
    if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
        device = /tablet|ipad/.test(ua) ? 'Tablet' : 'Mobile';
    }

    // Browser Detection
    let browser = 'Unknown';
    if (/chrome/.test(ua)) browser = 'Chrome';
    else if (/firefox/.test(ua)) browser = 'Firefox';
    else if (/safari/.test(ua)) browser = 'Safari';
    else if (/edge/.test(ua)) browser = 'Edge';
    else if (/opera|opr/.test(ua)) browser = 'Opera';

    // OS Detection
    let os = 'Unknown';
    if (/windows/.test(ua)) os = 'Windows';
    else if (/mac os/.test(ua)) os = 'macOS';
    else if (/linux/.test(ua)) os = 'Linux';
    else if (/android/.test(ua)) os = 'Android';
    else if (/ios|iphone|ipad/.test(ua)) os = 'iOS';

    return { device, browser, os };
};

const getPublicIP = async (): Promise<string> => {
    try {
        const response = await axios.get('https://api.ipify.org?format=json');
        return response.data.ip;
    } catch (error) {
        console.error('Public IP discovery failed:', error);
        return '208.67.222.222'; // Random fallback public IP
    }
};

export const getLocationFromIP = async (ip: string): Promise<LocationInfo> => {
    const API_KEY = process.env.API_Key;
    const FINDMYIP_API_URL = 'https://api.findip.net';

    if (!API_KEY) {
        console.warn('⚠️ API_Key is missing in .env file');
    }

    try {
        let targetIp = ip;

        // If local IP, try to get public IP
        if (!targetIp || targetIp === '127.0.0.1' || targetIp === '::1' || targetIp.includes('192.168.') || targetIp.includes('10.0.')) {
            // Only try to fetch public IP if in dev environment, otherwise just log warning
            if (process.env.NODE_ENV === 'development') {
                try {
                    const publicIp = await getPublicIP();
                    console.log(`📍 Local IP detected (${targetIp}), using public IP: ${publicIp}`);
                    targetIp = publicIp;
                } catch (e) {
                    // Keep original if fail
                }
            }
        }

        const url = `${FINDMYIP_API_URL}/${targetIp}/?token=${API_KEY}`;
        const response = await axios.get(url);
        const data = response.data;

        return {
            city: data.city?.names?.en || 'Unknown',
            continent: data.continent?.names?.en || 'Unknown',
            country: data.country?.names?.en || 'Unknown',
            countryCode: data.country?.iso_code || 'Unknown',
            currency: data.currency || (data.country?.iso_code === 'US' ? 'USD' : 'Unknown'),
            timezone: data.location?.time_zone || 'Unknown',
            ip: data.traits?.ip_address || (data.ip || targetIp),
            success: true
        };
    } catch (error: any) {
        console.error('FindMyIP API Error:', error.message);
        return {
            ip: ip,
            country: 'Unknown',
            city: 'Unknown',
            continent: 'Unknown',
            countryCode: 'Unknown',
            currency: 'Unknown',
            timezone: 'Unknown',
            success: false,
            error: error.message
        };
    }
};
