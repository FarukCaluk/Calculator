const konj = document.getElementById("konj");
function dodajNaDispley(input){
    konj.value += input;
}
function obrisiDispley(){
    konj.value = "";
}
function Racunaj(){
    try{

        konj.value= eval(konj.value);
    }
    catch(error){
        konj.value="Error"
    }
}
