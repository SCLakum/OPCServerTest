// const { connect, query } = require('mssql');

// const ConnectSQL = async () => {
//     console.log("SQL Start");
//     const config = {
//         user: 'sa',
//         password: 'Admin@123',
//         server: 'localhost', // or '127.0.0.1'
//         database: 'TestDB',
//         options: {
//             encrypt: false,
//             trustServerCertificate: true
//         }
//     };

//     try {
//         await connect(config);
//         const result = await query`SELECT * FROM Recipe`;
//         console.dir(result);
//     } catch (err) {
//         console.log("Error: " + err);
//     }
// };

// module.exports = ConnectSQL;
const sql = require('mssql');
const mongoose = require('mongoose');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // Import uuid for generating unique IDs

// SQL Server configuration
const sqlConfig = {
    user: 'sa',
    password: 'Admin@123',
    server: 'localhost', // or 'SUNIL'
    database: 'TestDB',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    },
};

// MongoDB configuration using Mongoose
const mongoUri = 'mongodb+srv://Admin:Admin_123@opctest.vet8u.mongodb.net/OPCTest?retryWrites=true&w=majority&appName=OPCTest'

// File to store pending updates when offline
const offlineFile = 'offlineData.json';

async function ConnectSQL() {
    console.log("Starting synchronization process...");
    try {
    
        await sql.connect(sqlConfig);

        // Connect to MongoDB with Mongoose
        await mongoose.connect(mongoUri);
        console.log("Connected to MongoDB with Mongoose.");

        // Fetch the Recipe table structure dynamically
        const sqlSchemaResult = await sql.query`SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Recipe'`;
        const sqlColumns = sqlSchemaResult.recordset;

        // Create Mongoose schema based on SQL table columns
        const recipeSchemaDefinition = {};
        sqlColumns.forEach(column => {
            switch (column.DATA_TYPE) {
                case 'int':
                    recipeSchemaDefinition[column.COLUMN_NAME] = Number;
                    break;
                case 'varchar':
                case 'nvarchar':
                case 'text':
                    recipeSchemaDefinition[column.COLUMN_NAME] = String;
                    break;
                case 'datetime':
                    recipeSchemaDefinition[column.COLUMN_NAME] = Date;
                    break;
                case 'float':
                    recipeSchemaDefinition[column.COLUMN_NAME] = Number;
                    break;
                default:
                    recipeSchemaDefinition[column.COLUMN_NAME] = String;
                    break;
            }
        });

        // Add a unique identifier to the schema
        recipeSchemaDefinition._id = {
            type: String,
            default: () => uuidv4(), // Generate a UUID as the unique ID
        };

        // Check if the model is already defined
        const Recipe = mongoose.models.Recipe || mongoose.model('Recipe', new mongoose.Schema(recipeSchemaDefinition, { versionKey: false }));

        // Fetch data from the SQL Recipe table
        const sqlResult = await sql.query`SELECT TOP (1000) * FROM Recipe`;
        const recipes = sqlResult.recordset;

        // Insert or update documents in MongoDB using Mongoose
        for (let recipe of recipes) {
            // Generate a new ID for new records
            // recipe._id = uuidv4();

            // Use the `findOneAndUpdate` method with upsert for inserting or updating in one go
            await Recipe.findOneAndUpdate(
                { SQL_ID: recipe.SQL_ID}, // Unique fields to identify a record
                recipe, // Data to insert or update
                { upsert: true, new: true } // Create if not found and return the updated document
            );
        }

        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    } catch (error) {
        console.log("Error: "+error);
    }
}

module.exports = ConnectSQL;