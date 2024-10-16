const MyScadaTags = {};
const MyScada = {};
const TagList = [];

MyScada['ScadaStatus'] = false;

const {
    OPCUAClient,
    MessageSecurityMode,
    SecurityPolicy,
    AttributeIds,
    DataTypeIds,
    NodeClass
} = require("node-opcua");

const connectionStrategy = {
    initialDelay: 1000,
    maxRetry: Infinity, // Keep retrying indefinitely
    maxRetryDelay: 1000, // Ensures the delay stays at 1000ms
    randomisationFactor: 0,
};

const options = {
    applicationName: "MyClient",
    connectionStrategy: connectionStrategy,
    securityMode: MessageSecurityMode.None,
    securityPolicy: SecurityPolicy.None,
    endpoint_must_exist: false,
};

const client = OPCUAClient.create(options);
const endpointUrl = "opc.tcp://122.176.231.224:48010";

async function connectToOpcUaClient() {
    try {
        // Step 1: Connect to the server
        await client.connect(endpointUrl);
        console.log("Connected!");

        // Step 2: Create a session
        const session = await client.createSession();
        console.log("Session created!");

        const namespaceIndex = "ns=2"
        const identifier = "s=Studio.Tags.Application"
        const applicationNodeId = `${namespaceIndex};${identifier}`;

        // Browse the `Application` node to list tags inside
        const tagsBrowseResult = await session.browse(applicationNodeId);

        // Step 4: Read the value of each tag inside the `Application` folder
        setInterval(async () => {
            try {
                for (const reference of tagsBrowseResult.references) {
                    const nodeId = reference.nodeId;
                    const browseName = reference.browseName.toString();
                    const identifier = nodeId.value;
                    const tagName = identifier.toString().split('.').pop();

                    const dataValue = await session.read({ nodeId, attributeId: AttributeIds.Value });
                    const dataTypeNode = await session.read({ nodeId, attributeId: AttributeIds.DataType });
                    const dataTypeNodeId = dataTypeNode.value.value;
                    const dataTypeDescription = await session.read({ nodeId: dataTypeNodeId, attributeId: AttributeIds.BrowseName });

                    const tagDetails = {
                        TagName: tagName,
                        Type: dataTypeDescription.value.value.toString(),
                        Value: dataValue.value.value.toString(),
                    };

                    MyScadaTags[tagName] = tagDetails;
                    if (!TagList.includes(tagName)) {
                        TagList.push(tagName);
                    }
                    console.log(`Tag: ${browseName}`);
                    console.log(`Identifier: s=${identifier}`);
                    console.log(`DataType: ${dataTypeDescription.value.value}`);
                }
                MyScada["TagList"] = TagList;
                MyScada["MyScadaTags"] = MyScadaTags;
                MyScada['ScadaStatus'] = true;
            } catch (readError) {
                MyScada['ScadaStatus'] = false;
                console.error("Error reading from OPC server:", readError.message);
            }
            console.log(MyScada);
        }, 1000);

    } catch (err) {
        MyScada['ScadaStatus'] = false;
        console.log("An error has occurred: ", err.message);
    }

    // Add disconnect event listeners to handle unexpected disconnections
    client.on("connection_lost", () => {
        MyScada['ScadaStatus'] = false;
        console.log("Connection to OPC UA server lost.");
    });

    client.on("backoff", (retry, delay) => {
        console.log(`Retrying to connect to OPC UA server. Attempt ${retry} in ${delay}ms`);
    });

    client.on("connection_reestablished", () => {
        console.log(`Reestablished OPC UA server.`);
    })

}

module.exports = {
    connectToOpcUaClient,
    MyScada
};
