let online = true // internet connection status
let count = 0 // count of current rows
let activePage
let totalPages = 0
let searching = false
let snackbar_name = 0, snackbar_uid = 0
// snackbar name is an integer id that is used to adjust the heights of snackbars on top of each other
// it is different from uid, in that it is decremented by one when the snackbar has been utilised and timed out
// uid is unique for every snackbar in the lifetime of this application

let selectedIDs = []

// Attaching listeners for selected row list below
Array.prototype.listeners = {}
Array.prototype.addListener = function(eventName, callback) {
    if (!this.listeners[eventName]) {
        // Create a new array for new events
        // idea of an array is we can invoke all callbacks
        this.listeners[eventName] = []
    }
    this.listeners[eventName].push(callback)
}
// New push Method
// Calls trigger event
Array.prototype.pushWithEvent = function() {
    const size = this.length
    let addingToZero = false
    if (size === 0)
        addingToZero = true
    const argsList = Array.prototype.slice.call(arguments)
    for (let index = 0; index < argsList.length; index++) {
        this[size + index] = argsList[index]
    }
    // trigger add event
    this.triggerEvent('add', argsList)
    if (addingToZero && this.length > 0)
        this.triggerEvent('addingToZero')
}
Array.prototype.removeWithEvent = function() {
    const argsList = Array.prototype.slice.call(arguments)
    let removed = []
    for (let arg of argsList) {
        if (this.indexOf(arg) !== -1) {
            this.splice(this.indexOf(arg), 1)
            removed.push(arg)
        }
    }
    // trigger remove event
    if (removed.length > 0){
        this.triggerEvent('remove', removed)
    }
    if (this.length === 0)
        this.triggerEvent('empty')
}
Array.prototype.triggerEvent = function(eventName, elements) {
    if (this.listeners[eventName] && this.listeners[eventName].length) {
        this.listeners[eventName].forEach(callback =>
            callback(eventName, elements, this)
        )
    }
}
// Array listeners end here

let properties

$.getJSON('properties.json', function(data) {
    properties = data
}).then(() => {
    $(document).ready(function() {
        console.log("Using host " + properties.host)

        $('#add-form-element').submit(function(event) {
            event.preventDefault();
        })

        loadInitial()

        window.addEventListener('offline', (e) => {
            sendError("You're offline", false)
            online = false
        })
        window.addEventListener('online', (e) => {
            sendError("Reloading...", false)
            location.reload();
        })

        $("#searchBar").on("change paste keyup manual", function() {

            if ($(this).val() === "") {
                searching = false
                $("#items-per-page").val('50')
                loadInitial()
            }
            else {
                searching = true
                $("#items-per-page").val('-1')
                searchEmployees($(this).val()).then(result => {
                    count = result.count
                    totalPages = 1
                    setPageNumbers(1)
                    // displaying loader while changing data
                    $(".loader").css("display","block")
                    $(".main-table").css("display","none")
                    $(".main-table tr:gt(0)").remove()
                    try {
                        if (count > 0){
                            for (let emp of result.list){
                                addRow(emp)
                            }
                        } else {
                            $(".main-table tbody").append("<tr><td colspan='6'>No results</td></tr>")
                        }
                        $(".loader").css("display","none")
                        $(".main-table").css("display","table")
                    } catch (e){
                        console.log(e)
                        sendError("Error occurred while parsing response from server", false)
                    }
                })
            }
        })

        // listening for selected rows
        selectedIDs.addListener('add', (items, args) => {
            for (let one of args){
                $('tr#'+one).addClass('selected')
            }
            $('#deselectAllBtn').html("Clear " + selectedIDs.length + " selection" +
                (selectedIDs.length === 1 ? "" : "s"))
        })

        // listening for deselected rows
        selectedIDs.addListener('remove', (items, args) => {
            for (let one of args){
                $('tr#'+one).removeClass('selected')
            }
            $('#deselectAllBtn').html("Clear " + selectedIDs.length + " selection" +
                (selectedIDs.length === 1 ? "" : "s"))
        })

        // listening for change of selected items from zero to one
        selectedIDs.addListener('addingToZero', () => {
            $('#removeBtn').css('display','inline-block')
            $('#deselectAllBtn').css('display','inline-block')
            $('.searchContainer').css('display','none')
        })

        // listening for change of selected items to none
        selectedIDs.addListener('empty', () => {
            $('#removeBtn').css('display','none')
            $('#deselectAllBtn').css('display','none')
            $('.searchContainer').css('display','block')
        })

        $(".addBtn").click(function () {
            // open a form with a click on the Add button
            if ($(".add-form-container").css("display") === "none"){
                $(".add-form-container").css("display","block")
            }
        })

        $(".deselectAllBtn").click(function () {
            while (selectedIDs.length != 0){
                selectedIDs.removeWithEvent(selectedIDs[0])
            }
        })
        
        $("#removeBtn").click(function () {
            $('.prompt').html("Are you sure you want to delete " + selectedIDs.length
                + " selected employee record" + (selectedIDs.length > 1 ? "s" : "")+ "?")
            $('.popup').addClass('is-visible')
        })

        $("#XPopupBtn, #NoPopupBtn").click(function () {
            $('.popup').removeClass('is-visible')
        })

        $("#YesPopupBtn").click(function () {
            removeSelectedEmployees()
            $('.popup').removeClass('is-visible')
        })

        $( "#items-per-page" ).change(function () {
            // this listener is called each time the dropdown selection is changed
            $(".loader").css("display","block")
            $(".main-table").css("display","none")
            $(".pane").css("display","none")

            $(".main-table tr:gt(0)").remove()
            //let selectedPage = parseInt($(".pagination a.active").text())
            let selectedOption = $( "#items-per-page option:selected" )
            let selectedNumber = isNaN(parseInt(selectedOption.text())) ?
                0 : parseInt(selectedOption.text()) // fetch all if NaN
            Promise.all([getPageCount(), getEmployees(1, selectedNumber)]).then(() => {
                // making the table visible and the loader invisible once the data has been fetched
                selectedNumber > 100 ? setPageNumbers(-1) : setPageNumbers(1)
                $(".loader").css("display","none")
                $(".main-table").css("display","table")
                $(".pane").css("display","block")
            })
        })
    })
})

function loadInitial(){
    $(".loader").css("display","block")
    $(".main-table").css("display","none")
    $(".main-table tr:gt(0)").remove()
    let selected = $( "#items-per-page option:selected" ).text()
    if (isNaN(parseInt(selected))){
        selected = 0 // fetching all employees, a numeric items-per-page selection was not found
    }

    Promise.all([getPageCount(), getEmployees(1, selected)]).then(() => {
        // making the table visible and the loader invisible once the data has been fetched
        setPageNumbers()
        $(".loader").css("display","none")
        $(".main-table").css("display","table")
        $(".pane").css("display","block")
    }).catch((err) => {
        console.log(err)
        sendError("Check if host is running at " + properties.host)
    })
}

function sendError(error, displayTable){
    if (displayTable){
        $(".loader").css("display", "none")
        $(".main-table").css("display", "table")
        $(".pane").css("display", "block")
        setTimeout(function () {
            $(".error").css('display','none')
        }, 7000)
    }
    else {
        $(".loader").css("display", "none")
        $(".main-table").css("display", "none")
        $(".pane").css("display", "none")
    }
    //$(".error").css('display','block').html(error)
    $("body").append("<div id='"+String(++snackbar_uid)+"' name='"+(String(++snackbar_name))+"' class=\"snackbar\" style='bottom:"+60*snackbar_name+"px'>"+error+"</div>")
    $("#"+snackbar_uid+".snackbar").addClass("show")
    setTimeout(function(id) {
        return function() {
            $("#"+id+".snackbar").remove()
            snackbar_name--;
            $(".snackbar").css( "bottom", "-=60" )
        }
    }(snackbar_uid), 3000)
    /*setTimeout(function () {
        var id = snackbar_name
        $("#"+id+".snackbar").removeClass("show")
    }, 3000)*/
}

function searchEmployees(surname){

    return new Promise((resolve, reject) => {

        $.get(properties.host + "/search",
            {search : surname, items : 0},
            function(data) {
               resolve(data)
            }).fail(function () {
            sendError("Error: Check request", false)
            reject()
        });
    })
}

function getEmployees(pageNo, itemsPerPage){
    if (!online)
        return
    if (itemsPerPage > 100 || isNaN(pageNo))
        pageNo = 1
    return new Promise((resolve, reject) => {
        $.get(properties.host + "/employees",
            {page : pageNo, items : itemsPerPage},
            function(data) {
                if (String(data.count) !== String(itemsPerPage))
                    if ( activePage !== totalPages)
                        sendError("Fetched items might not be " + itemsPerPage, true)

                count = data.count
                try {
                    for (let emp of data.list){
                        addRow(emp)
                    }

                    resolve()
                } catch (e){
                    console.log(e)
                    sendError("Error occurred while parsing response from server", false)
                    reject()
                }
            }).fail(function () {
            sendError("Error: Check request", false)
            reject()
        });
    })
}

function setPageNumbers(active = 1){
    if (!online)
        return
    if(isNaN(active)){
        active = 1
    }
    $(".pagination a").remove()
    if(active === -1)
        return
    $(".pagination").append("<a class='enabled' id='prevBtn' onclick='goToPage("+(active-1)+")'>Previous</a>")

    if (totalPages >= 2){
        $(".pagination").append("<a class='enabled' id='firstPageBtn' onclick='goToPage(1)'>First</a>")
    }

    if (active - 1 > 1){
        $(".pagination").append("<a class='disabled ellipses'>...</a>")
    }

    if (active === 1){
        $('#prevBtn').removeClass("enabled")
        $('#prevBtn').addClass("disabled")
        $('#firstPageBtn').addClass("active")
    }

    for (i = active-1; i <= active+1; i++){
        if (i < 1 || i > totalPages)
            continue
        $(".pagination").append("<a class='enabled' id="+i+">"+i+"</a>")
    }

    if (active + 1 < totalPages){
        $(".pagination").append("<a class='disabled ellipses'>...</a>")
    }

    $( ".pagination a" ).click(function() {
        if(isNaN(parseInt($(this).text())))
            return
        goToPage(parseInt($(this).text()))
    });
    $(".pagination a#"+active).addClass("active")

    if (totalPages >= 2){
        $(".pagination").append("<a class='enabled' id='lastPageBtn' onclick='goToPage("+totalPages+")'>Last</a>")
    }

    $(".pagination").append("<a id='nextBtn' class='enabled' onclick='goToPage("+(active+1)+")'>Next</a>")

    if (active === totalPages){
        $('#nextBtn').removeClass("enabled")
        $('#nextBtn').addClass("disabled")
        $('#lastPageBtn').addClass("active")
    }

    activePage = active
}

function goToPage(page){
    if (page < 1 || page > totalPages || page === activePage)
        return

    // displaying loader while changing data
    $(".loader").css("display","block")
    $(".main-table").css("display","none")

    $(".pagination").find("a").removeClass( "active" )
    $(this).addClass("active")
    $(".main-table tr:gt(0)").remove()
    if (!isNaN(page)){
        activePage = page
        getEmployees(page, $( "#items-per-page option:selected" ).text()).then(() => {
            setPageNumbers(parseInt(page))
            $(".loader").css("display","none")
            $(".main-table").css("display","table")
        }).catch(() => {
            sendError("Could not get rows for page " + page, true)
        })
    } else {
        sendError("Invalid page number: " + page, true)
    }
}

function getPageCount(){
    let itemsPerPage = isNaN(parseInt($("#items-per-page option:selected").text())) ?
        0 : parseInt($("#items-per-page option:selected").text())
    return new Promise((resolve, reject) => {
        $.get(properties.host + "/count", function (response) {
            totalPages = itemsPerPage === 0 ? 1 : Math.ceil(response.employeeCount / itemsPerPage)
            resolve(totalPages)
        }).fail(function () {
            sendError("Failed to get page count")
            reject("Failed to find page count")
        })
    })
}

function closeForm() {
    clearForm()
    $(".add-form-container").css("display","none")
}

function submitData(){
    let form_data = $('#add-form-element').serializeArray().reduce(function(obj, item) {
        obj[item.name] = item.value;
        return obj;
    }, {});

    if (properties.clientSideValidation == true){
        let emptyField = false
        let inputCheck = true
        for (let item in form_data){
            let dateRegex = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/
            if (!form_data[item]){
                emptyField = true
            } else if (item === "id" && /\D/.test(form_data[item])) {
                sendError("ID must be numeric", true)
                inputCheck = false
            } else if (item === "birthDate" && (!dateRegex.test(form_data[item])
                || form_data[item].includes('.'))) {
                sendError("Birth date must be entered as dd/mm/yyyy", true)
                inputCheck = false
            } else if (item === "joinDate" && (!dateRegex.test(form_data[item])
                || form_data[item].includes('.'))){
                sendError("Join date must be entered as dd/mm/yyyy", true)
                inputCheck = false
            }
        }
        if (emptyField) {
            sendError("All fields are mandatory", true)
            return
        }
        if (!inputCheck)
            return
    }

    let final = JSON.stringify(form_data)

    let req = $.ajax({
        type: "POST",
        url: properties.host + "/add",
        dataType: 'json',
        contentType: 'application/json',
        data: final,
    })
        .done(function(data) {
            if (data.success) {
                closeForm()
                getNewForCurrentPage()
                getPageCount().then((result) => {
                    setPageNumbers(activePage)
                })
                sendError("Added Employee Successfully", true)
            }
        })
        .fail(function(data) {

            try {
                if (data.responseJSON){
                    let response = data.responseJSON
                    if (response.error ){
                        sendError(response.error, true)
                    } else if (response.message){
                        sendError(response.message, true)
                    } else if (response.errors){
                        for (let one of response.errors){
                            sendError("Invalid value for " + one.param + ": " + one.value, true)
                        }
                    }
                } else if (data.responseText){
                    sendError(data.responseText)
                }
            } catch (e) {
                console.log(e)
                sendError("Failed to add employee, check console for possible CORS error", true)
            }
        })
}

function removeSelectedEmployees() {

    if (selectedIDs.length > 5){
        sendError("Cannot remove more than 5 employees at a time", true)
        return
    }


    let data = {idList: selectedIDs}

    $.ajax({
        url: properties.host + "/delete",
        type: 'DELETE',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify(data),
    }).done(function (data) {
        if (data.success){
            if (searching){
                $('.searchBar').trigger("manual")
            } else {
                getNewForCurrentPage()
                getPageCount().then((result) => {
                    setPageNumbers(activePage)
                })
            }
            while (selectedIDs.length != 0){
                selectedIDs.removeWithEvent(selectedIDs[0])
            }
            sendError("Successfully deleted " + data.rowsChanged + " employee" +
                (data.rowsChanged > 1 ? "s" : ""), true)
        }
    })
}

function clearForm(){
    $('#add-form-element')[0].reset();
}

function getNewForCurrentPage() {
    let url = properties.host + '/employees'
    let params = 'page=' + activePage + '&items=' + parseInt($("#items-per-page option:selected").text())
    url += '?' + params;
    let request = new XMLHttpRequest();
    request.open('GET', url);
    request.addEventListener('readystatechange', updatePage);
    request.send();
}

function updatePage(){
    let request = this;
    if (request.readyState !== 4)
        return
    if (request.status === 200) {
        $(".main-table tr:gt(0)").remove()
        let response = JSON.parse(request.responseText)
        if (response.count === 0){
            goToPage(activePage-1)
            return
        }
        for (let row of response.list){
            addRow(row)
        }
    }
}

function addRow(emp){
    let className = selectedIDs.includes(emp.id) ? "selected" : ""
    var item = " <tr id='"+emp.id+"' onclick='clickRow("+emp.id+")' class='"+className+"'>\n" +
        "            <td>" + emp.id +"</td>\n" +
        "            <td>"+ emp.name +"</td>\n" +
        "            <td>"+ emp.surname +"</td>\n" +
        "            <td>"+emp.gender+"</td>\n" +
        "            <td>"+emp.birthDate+"</td>\n" +
        "            <td>"+emp.joinDate+"</td>\n" +
        "        </tr>";
    $(".main-table tbody").append(item)
}

function clickRow(id) {
    if (selectedIDs.includes(id)){
        selectedIDs.removeWithEvent(id)
    } else {
        selectedIDs.pushWithEvent(id)
    }
}
