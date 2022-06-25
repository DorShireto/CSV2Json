# CSV2Json
Simple CSV2Json converting - browser sendes to server CSV file, server will generte json file from CSV and save both files in system, and return the json to browser.

To add new file - click on "**Add New File**"
**Please note that only .csv files will be accpted**

**To delete specific files:**
Use checkbox on the table row to mark which files you wishes to delete
Then, click on "**Delete Selected Rows**"

**To delete all files from server:**
Click on "**Delete All**"

packages in use:

**Front:**
 * Bootstrap
 * Axios
 
**Backend:**
  * Express
  * CORS
  * fs
  * path
  * multer
