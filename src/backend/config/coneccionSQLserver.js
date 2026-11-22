import mssql from "mssql";
//Cree un objeto que contiene los parametros de conexion a nuestra bd 
const connectionsettings = {
    server: "localhost,1434",
    database: "bd_restaurante",
    user: "sa",
    password: "Admin123!",
    options:{
        encrypt: true,
        trustServerCertificate: true
    } };

    export async function getConnection(){  
        try{
        return await mssql.connect (connectionsettings); //retorna lo que dice la libreria sql en el parametro connect por medio de una promesa 
    }
    catch(error)
    { console.error(error);

    }
}
  export {mssql};
