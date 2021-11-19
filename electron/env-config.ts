export function getEnvCfg() {
    switch (process.env['SQ_ENV_CFG']) {
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
