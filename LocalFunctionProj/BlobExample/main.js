import { BlobServiceClient } from '@azure/storage-blob';
import openpgp from 'openpgp';
import fs from 'fs';
import { Transform, Writable } from 'stream';
import { Kafka } from 'kafkajs';

 async function publishtokafka() {
//     const AZURE_STORAGE_CONNECTION_STRING = 'AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;DefaultEndpointsProtocol=http;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;'
    //   const AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=samir;AccountKey=KemKAlZnTFD/h7FiKFYVwjxSKflTP+wPtdZEPyFelQMbang5S7EyT/eIHv9GqOyhMUGdi+6kRBFX+AStzTM9aA==;EndpointSuffix=core.windows.net';
       const AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=loyaltysamirblobgrob1a3;AccountKey=ELcMwA0aW9K05n/gsRDWj0h2SsPB+R96XK3sBYbrmmMYxJwi+Bb/yB8eo6+kKYnymJKIGU78fLE/+AStYu5hUg==;EndpointSuffix=core.windows.net'
    const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

    const containerName = 'files';
    const containerClient = blobServiceClient.getContainerClient(containerName);

//     const blobName = 'gap_uat_profile_extract_huge_2021053111050202.csv.pgp';
    const blobName = 'gap_uat_profile_extract_2022042001000203.csv.gpg';
    const blobClient = containerClient.getBlockBlobClient(blobName);

    const encryptedDataStream = (await blobClient.download(0)).readableStreamBody;
    encryptedDataStream.setEncoding('utf-8');


    const passphrase = 'Loy@ltymtlaccountmatch';
    const privateKeyArmored = fs.readFileSync('PrivateKey.asc', 'utf-8');
    
    

    const privateKey = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({armoredKey: privateKeyArmored}),
        passphrase
    });
    
    const decryptedData = await openpgp.decrypt({
        message: await openpgp.readMessage({armoredMessage: encryptedDataStream}),
        decryptionKeys: privateKey,
        config: {allowUnauthenticatedStream: true}
    });

       const kafka = new Kafka({
   
        ssl: true,
        brokers: ["pkc-l7pr2.ap-south-1.aws.confluent.cloud:9092"],
        clientId: 'my-app',
        sasl: {
            mechanism: 'plain', // scram-sha-256 or scram-sha-512
            username: "NHVCNS5ENWZ2PJLI",                                                             // sasl username
            password: "NWdaBXYNUFnrXMVPfZXq5aoYwkqNGaORUfRjZrR3BcbM46uxYi8LC1Ic9zFl3CJE"              // sasl password
          },
          connectionTimeout: 3000
           
      });

    const producer = kafka.producer();
    await producer.connect();


const t = new Transform({objectMode: true, 
    transform(chunk, encoding, done) {
        let data = chunk.toString();
        if (this._lastLineData)
        data = this._lastLineData + data;

        let lines = data.split('\n');
        this._lastLineData = lines.splice(lines.length-1, 1)[0];

        lines.forEach(this.push.bind(this));
        done();
    },
    flush(done){
        if (this._lastLineData) 
        this.push(this._lastLineData)
        this._lastLineData = null;
        done();
   }});

    // const indices = [0, 26, 29];
    // const headers = ['loyaltyMemberId', 'eventDateTime', 'currentTier'];
    let lineNo = 0;

    let obj = {
        'loyaltyMemberId': '',
        'eventDateTime': '',
        'publishDateTime': '',
        'currentTier': '',
        'marketCode': ''
    };

    const w = new Writable({
        write: async(chunk, encoding, done) => {
            if (lineNo < 2) {
                lineNo++;
            } else {
                const fields = (chunk.toString()).split(',');

                obj['loyaltyMemberId'] = fields[0];
                obj['eventDateTime'] = fields[26];
                obj['publishDateTime'] = (new Date()).toLocaleString();
                obj['currentTier'] = fields[29];
                obj['marketCode'] = 'US';

                await producer.send({
                    topic: 'data',
                    messages: [{value: JSON.stringify(obj)}]
                });
            }
            done();
        }
    });

    w.on('finish', () => {process.exit(1)});
    
   decryptedData.data.pipe(t).pipe(w);

}
publishtokafka();
export {publishtokafka};