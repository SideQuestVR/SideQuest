require('./config');

export function getEnvCfg() {
    const cfg = process.env['SQ_ENV_CFG'] || global.SQ_ENV_CFG;
    console.log('SQ_ENV_CFG:', cfg);
    switch (cfg) {
        case 'test':
            return {
                web_url: 'https://sidetestvr.com',
                ws_url: 'wss://ws.sidetestvr.com',
                http_url: 'https://api.sidetestvr.com',
                cdnUrl: 'https://cdn.sidetestvr.com',
                shortenerUrl: 'https://links.sidetestvr.com',
            };
        case 'test2':
            return {
                web_url: 'https://test.side.quest',
                ws_url: 'wss://testws.side.quest',
                http_url: 'https://testapi.side.quest',
                cdnUrl: 'https://testcdn.sidequestvr.com',
                shortenerUrl: 'https://testlinks.side.quest',
            };
        case 'fried':
        case 'friedquest':
            return {
                web_url: 'https://friedquestvr.com',
                ws_url: 'wss://ws.friedquestvr.com',
                http_url: 'https://api.friedquestvr.com',
                cdnUrl: 'https://cdn.friedquestvr.com',
                shortenerUrl: 'https://links.friedquestvr.com',
            };
        case 'localhost':
            return {
                web_url: 'http://127.0.0.1:3005',
                ws_url: 'ws://127.0.0.1:3008',
                http_url: 'http://127.0.0.1:3000',
                cdnUrl: 'http://127.0.0.1:3001',
                shortenerUrl: 'http://127.0.0.1:3004',
            };
        case 'local':
            return {
                web_url: 'https://sidequestvr.local',
                ws_url: 'wss://ws.sidetestvr.local',
                http_url: 'https://api.sidetestvr.local',
                cdnUrl: 'https://cdn.sidetestvr.local',
                shortenerUrl: 'https://links.sidetestvr.local',
            };
        default:
            return {
                web_url: 'https://sidequestvr.com',
                ws_url: 'wss://ws.sidequestvr.com',
                http_url: 'https://api.sidequestvr.com',
                cdnUrl: 'https://cdn.sidequestvr.com',
                shortenerUrl: 'https://sdq.st',
            };
    }
}
