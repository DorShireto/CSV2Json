const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

var multer = require('multer');


/**
 * Filter function for multer
 * method will be added to multer config
 * method checks if file already exist in the server
 * if so, will return callback with Error - file already exist
 *      Error will be handle in EP
 * if not, return callback with true value - which tells multer to continue with saving process
 * 
 */
const uploadFilter = function (req, file, callback) {
    let csvFiles = fs.readdirSync(__dirname + '/csvs');
    if (csvFiles.length === 0) {
        callback(null, true)
    }
    csvFiles.forEach(fileInDir => {
        if (fileInDir === file.originalname) {
            console.log("File already exist")
            return callback(new Error('File already exist'));
        }
    });

    callback(null, true)
}

// Storage Engin That Tells/Configures Multer for where (destination) and how (filename) to save/upload our files
const fileStorageEngine = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./csvs"); // directory in where multer will be saving files
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // tell multer what name to give to the file
    },
});


/**
 * Set up multer upload method
 * Only accept single file upload with uploadCsv as name
 */
const upload = multer({
    storage: fileStorageEngine,
    fileFilter: uploadFilter
}).single('uploadCsv');

/**
 * Converting CSV file to Json object
 * @param csvPath - path to csv file that need to be converted
 * @returns Json object
 */
function convertCSV2Json(csvPath) {
    var csv = fs.readFileSync(csvPath)

    const array = csv.toString().split("\n");

    /* Store the converted result into an array */
    const csvToJsonResult = [];

    /* Store the CSV column headers into seprate variable */
    const headers = array[0].split(", ")

    /* Iterate over the remaning data rows */
    for (let i = 1; i < array.length - 1; i++) {
        /* Empty object to store result in key value pair */
        const jsonObject = {}
        /* Store the current array element */
        const currentArrayString = array[i]
        let string = ''

        let quoteFlag = 0
        for (let character of currentArrayString) {
            if (character === '"' && quoteFlag === 0) {
                quoteFlag = 1
            }
            else if (character === '"' && quoteFlag == 1) quoteFlag = 0
            if (character === ', ' && quoteFlag === 0) character = '|'
            if (character !== '"') string += character
        }

        let jsonProperties = string.split("|")

        for (let j in headers) {
            if (jsonProperties[j].includes(", ")) {
                jsonObject[headers[j]] = jsonProperties[j]
                    .split(", ").map(item => item.trim())
            }
            else jsonObject[headers[j]] = jsonProperties[j]
        }
        /* Push the genearted JSON object to resultant array */
        csvToJsonResult.push(jsonObject)
    }
    /* Convert the final array to JSON */
    const json = JSON.stringify(csvToJsonResult);
    return json;
}

/**
 * Deleting specific files only,
 * This method is an help method for /deleteFiles EP
 * @param filesList - list of strings, each entry is the name of file need to be deleted
 */
function deleteFiles(filesList) {
    try {
        filesList.forEach(fileName => {
            fs.unlinkSync(__dirname + "/jsons/" + fileName.concat('.json'));
            // var name = fileName.replace('.json', '.csv');
            fs.unlinkSync(__dirname + "/csvs/" + fileName.concat('.csv'));
            console.log(fileName + ' files were deleted from server')
        });
    } catch (error) {
        console.log(error);
    }
}

/**
 * Deleting all files in specific directory
 * This method is an help method for /deleteAllFiles EP
 * @param dir - path to directory that of the files that needs to be deleted
 */
function deleteAllFilesAt(dir) {
    fs.readdir(dir, (err, files) => {
        if (err) throw err;

        for (const file of files) {
            fs.unlink(path.join(dir, file), err => {
                if (err) throw err;
            });
        }
    });
}
/**
 * This is an help method for /newFile/:fileName EP
 * @param  fileName - name of file to look for
 * @param  dir - name of folder to look at
 * @returns true if file exist, false if not
 */
function checkIfFileExist(fileName, dir) {
    let csvFiles = fs.readdirSync(__dirname + '/' + dir)
    if (csvFiles.length === 0) {
        return false
    }
    csvFiles.forEach(file => {
        if (file === fileName) {
            return true
        }
    });
    return false
}

let app = express();


async function main() {
    app.use(express.json()); // parse application/json
    app.use(cors()) // Cross-Origin Resource Sharing-

    /**
     * EP - checking that server is alive
     */
    app.get("/keepalive", (req, res) => {
        res.status(200).send("alive!");
    });

    /**
     * EP "/" - serve the html file to the browser
     */
    app.get("/", (req, res) => {
        res.status(200).sendFile(__dirname + "/index.html")
    })


    /**
     * EP - /newFile
     * This End point uses 2 middle wares: 
     *      1. check that file not exist already.
     *      2. use multer to save file
     * files will be sent to EP as dataForm objects.
     * returns:
     *      200 - file was exist - return json file
     *      201 - file was not exist - create new file
     */

    app.post('/newFile/:fileName', function (req, res, next) {
        upload(req, res, (err) => { // multer middleware for uploading and validation.
            if (err) { // file already exist, return 200 + json file
                var fileName = req.params.fileName;
                var fileAsJson = fileName.replace('.csv', '.json')
                var fileExist = checkIfFileExist(fileAsJson, 'jsons') // will return true / false if file exist
                if (!fileExist) {
                    var jsonFile = convertCSV2Json(__dirname + '/csvs/' + fileName); // generate Json object from csv
                    fs.writeFile(__dirname + "/jsons/" + fileAsJson, jsonFile, 'utf-8', (err) => { // save file to /jsons directory
                        if (err) {
                            console.log("Failed to save json file")
                        }
                    });
                }
                else { // json file exist
                    jsonFile = require(__dirname + '/jsons/' + fileAsJson) // import json file
                }
                return res.status(200).send(jsonFile) // send response with Json if CSV was already exist
            }

            // file was not existing before - generate json and send 201
            console.log('Saving the file: ', req.params.fileName.replace('.csv', ''));
            var fileName = req.file.originalname.replace('.csv', '');
            var csvAsJson = convertCSV2Json(__dirname + "/csvs/" + req.file.originalname) // generate Json object from csv
            fs.writeFile(__dirname + "/jsons/" + fileName + '.json', csvAsJson, 'utf8', (err) => {  // save file to /jsons directory
                if (err) {
                    console.log("Error: ", err)
                }
                else {
                    res.status(201).send(fileName + '.json')
                }
            });

        })
    });


    /**
     * Endpoint - /deleteFiles
     * method will get list of files that users want to delete.
     * method will delete both csv and json instances of file
     * response options:
     *      200 - files were deleted.
     *      204 - no files were received
     */
    app.delete('/deleteFiles', (req, res, next) => {
        var filesToDelete = (req.body.filesToDelete);
        if (filesToDelete.length === 0) {
            res.status(204).send("No files were found");
        }
        deleteFiles(filesToDelete)
        res.status(200).send("files deleted from server...")

    })

    /**
     * Endpoint - /deleteAllFiles
     * method will delete all csv and json instances
     * response options:
     *      200 - files were deleted.
     *      204 - no files were received
     */
    app.delete('/deleteAllFiles', async (req, res, next) => {
        let csvFiles = fs.readdirSync(__dirname + '/csvs').length;
        let jsonFiles = fs.readdirSync(__dirname + '/jsons').length;
        if (csvFiles === 0 || jsonFiles === 0) {
            res.status(204).send("No files were found");
            return;
        }

        //delete all files in /csvs
        deleteAllFilesAt(__dirname + "/csvs");
        //delete all files in /jsons
        deleteAllFilesAt(__dirname + "/jsons");
        res.status(200).send("All files were deleted");
    })
}

main();
module.exports = app;
