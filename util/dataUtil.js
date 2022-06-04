const protobuf = require("protobufjs");

let packetIds = require("./packetIds.json");
let switchedPacketIds = (function() {
    let obj = {}
    const name = require("./packetIds.json")
    for(x in name) {
        obj[name[x]] = x
    }
    return obj
})();

module.exports = {

    

    xorData(data, key) {
        for (let i = 0; i < data.length; i++) {
            data.writeUInt8(data.readUInt8(i) ^ key.readUInt8(i % key.length), i);
            //data[i] = data.readUInt8(i) ^ key.readUInt8(i % 4096);
            // data[i] = (data[i] & (~key[i % 4096])) | ((~data[i] ) & key[i % 4096])
        }
    },

    removeMagic(data) {
        var moreSliced = Buffer.from(data.slice(10)); // Removes two byte magic
        moreSliced = moreSliced.slice(0, moreSliced.byteLength - 2); // Removes two byte magic at the end
        moreSliced = moreSliced.slice(data.readUInt8(5));
        return moreSliced;
    },

    parsePacketData(data) {
        var buff = this.removeMagic(data);
        return buff.slice(data.readUInt8(6), buff.length);
    },

    getProtoNameByPacketID(packetID) {
        const name = packetIds[packetID]
        if(name == undefined) return packetID;

        return name;
    },

    getPacketIDByProtoName(protoName) {
        const name = switchedPacketIds[protoName];
        if(name == undefined) return protoName;

        return name;
    },

    async objToProtobuffer(obj, packetID) {
        try {
            var protoName = this.getProtoNameByPacketID(packetID);

            if (protoName == "None") {
                return protoName;
            }

            const root = await protobuf.load("./proto/" + protoName + ".proto");
            const testMessage = root.lookup(protoName);
            const message = testMessage.create(obj);
            return testMessage.encode(message).finish();

        } catch (e) {
            console.log(e)
        }
    },

    async dataToProtobuffer(data, packetID) {

        var moreSliced = data;
        try {
            var protoName = this.getProtoNameByPacketID(packetID);

            if (protoName == "None") {
                return protoName;
            }

            const root = await protobuf.load("proto/" + protoName + ".proto");
            const testMessage = root.lookup(protoName);
            const message = testMessage.decode(moreSliced);
            return message;
        } catch (e) {
            console.log("Error parsing packet %s : Error: %s", this.getProtoNameByPacketID(packetID), e)
        }
    },

    async reformatKcpPacket(message) {
        let i = 0;
        let tokenSizeTotal = 0;
        let messages = [];
        while (i < message.length) {
            let convId = message.readUInt32BE(i);
            let remainingHeader = message.subarray(i + 8, i + 28);
            let contentLen = message.readUInt32LE(i + 24);
            let content = message.subarray(i + 28, i + 28 + contentLen);

            let formattedMessage = Buffer.alloc(24 + contentLen);
            formattedMessage.writeUInt32BE(convId, 0);
            remainingHeader.copy(formattedMessage, 4);
            content.copy(formattedMessage, 24);
            i += 28 + contentLen;
            tokenSizeTotal += 4;
            messages.push(formattedMessage);
        }
        return Buffer.concat(messages, message.length - tokenSizeTotal);
    },

    async dataToPacket(data, packetID, keyBuffer) {
        var magic2 = Buffer.from(0x89AB.toString(16), 'hex')                        // 45670005000c0000000b 18f7032801309df197eea02f10cbc4a086062566c8
        var part1 = Buffer.alloc(10)
        var metadata = await this.objToProtobuffer({ sent_ms: Date.now() }, 13371337)
        part1.writeUInt16BE(0x4567, 0)
        part1.writeUInt16BE(packetID, 2)
        part1.writeUInt8(metadata.length, 5)
        part1.writeUInt16BE(data.length, 8)

        var ret = Buffer.concat([part1, metadata, data, magic2], part1.length + metadata.length + data.length + magic2.length);
        this.xorData(ret, keyBuffer)
        return ret;

    },

    formatSentPacket(data, token) {
        let dataa = Buffer.from(data, 'hex')
        var it = 0;
        let msgs = []
        while (it < dataa.length) {
            let _Conv = dataa.readUInt32BE(it);
            let contentLen = dataa.readUInt32LE(it + 20);
            let newStart = Buffer.alloc(8);
            newStart.writeUInt32BE(_Conv, 0);
            newStart.writeUInt32BE(token, 4);

            var slice = dataa.subarray(it + 4, it + 24 + contentLen);
            var awa = Buffer.concat([newStart, slice])
            msgs.push(awa);
            it += contentLen + 24

        }
        dataa = Buffer.concat(msgs);
        return dataa;
    },

    getPackets(data, len = 28) {
        var it = 0;
        var buffers = []
        while (it < data.length) {
            let contentLen = data.readUInt32BE(it + len - 4)
            let sliced = data.slice(it, it + len + contentLen)
            buffers.push(sliced)
            it += len + contentLen
        }
        return buffers;
    }
}