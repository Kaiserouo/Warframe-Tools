async function _decryptLastData(arrayBuffer) {
  const KEY = new Uint8Array([
      76, 69, 79, 45, 65, 76, 69, 67,
      9, 69, 79, 45, 65, 76, 69, 67
  ]);

  const IV = new Uint8Array([
      49, 50, 70, 71, 66, 51, 54, 45,
      76, 69, 51, 45, 113, 61, 57, 0
  ]);

  const BLOCK_SIZE = 16;

  const data = new Uint8Array(arrayBuffer);

  if (data.length % BLOCK_SIZE !== 0) {
      throw new Error(`Input size is not multiple of AES block size (${data.length} bytes / ${BLOCK_SIZE} bytes)`);
  }

  const cryptoKey = await crypto.subtle.importKey("raw", KEY, { name: "AES-CBC" }, false, ["decrypt"]);

  // Web Crypto does PKCS#7 removal automatically.
  const decrypted = await crypto.subtle.decrypt({name: "AES-CBC", iv: IV}, cryptoKey, data);

  return new Uint8Array(decrypted);
}

export async function _parseInventoryFile(contentArrayBuffer) {
  let inventoryData = null;
  console.log("Parsing inventory file content: ", contentArrayBuffer);
  
  try {
    let textContent;
    if (contentArrayBuffer instanceof ArrayBuffer) {
      textContent = new TextDecoder().decode(contentArrayBuffer);
    }
    inventoryData = JSON.parse(contentArrayBuffer instanceof ArrayBuffer ? textContent : contentArrayBuffer);
  } catch (error) {
    // not a valid json, try to parse as lastData.dat format
    try {
      inventoryData = await _decryptLastData(contentArrayBuffer);
      inventoryData = JSON.parse(new TextDecoder().decode(inventoryData));
    } catch (error) {
      console.error(error); 
      throw new Error("Invalid JSON format or not lastData.dat format");
    }
  }
  
  if (inventoryData.InventoryJson) {
    inventoryData = JSON.parse(inventoryData.InventoryJson);
  }

  console.log("Parsed inventory data: ", inventoryData);
  return inventoryData;
}

export function getInventoryFromFile(file) {
  /*
    parses files
    can be one of the following formats:
    - lastData.dat, i.e., the two of the following encoded by Alecaframe
    - inventory json, i.e., {"Created": ..., "Upgrades": ...}
    - inventory json with last mission info, i.e., {"InventoryJson": ..., ...}
  */
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const inventoryData = await _parseInventoryFile(event.target.result);
        resolve(inventoryData);
      } catch (error) {
        reject(`Error parsing JSON: ${error.message}`);
      }
    };
    reader.onerror = (error) => {
      reject(`Error reading file: ${error.message}`);
    };
    reader.readAsArrayBuffer(file);
  });
}