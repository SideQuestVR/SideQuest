const Command = require('@devicefarmer/adbkit/dist/src/adb/command').default;
const Protocol = require('@devicefarmer/adbkit/dist/src/adb/protocol').default;

const RE_KEYVAL = /^\[([\s\S]*?)\]: \[([\s\S]*?)\]\r?$/gm;

export class SetPropertiesCommand extends Command {
    constructor(arg) {
        super(arg);
    }

    execute(command) {
        this._send('shell:setprop ' + command);
        return this.parser.readAscii(4).then(
            (function(_this) {
                return function(reply) {
                    switch (reply) {
                        case Protocol.OKAY:
                            return _this.parser.readAll().then(function(data) {
                                return _this._parseProperties(data.toString());
                            });
                        case Protocol.FAIL:
                            return _this.parser.readError();
                        default:
                            return _this.parser.unexpected(reply, 'OKAY or FAIL');
                    }
                };
            })(this)
        );
    }

    _parseProperties(value) {
        var match, properties;
        properties = {};
        while ((match = RE_KEYVAL.exec(value))) {
            properties[match[1]] = match[2];
        }
        return properties;
    }
}
