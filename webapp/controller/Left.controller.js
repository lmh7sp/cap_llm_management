sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/plugins/UploadSetwithTable",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function(BaseController, UploadSetwithTable, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    return BaseController.extend("capllmmanagement.controller.Left", {
        onInit: function() {
            this.oOwnerComponent = this.getOwnerComponent();
            this.oRouter = this.oOwnerComponent.getRouter();
            this.oRouter.getRoute("home").attachPatternMatched(this.onRouteMatched, this);
        },

        onRouteMatched: function(e) {
            // const {} = e.getParameter("arguments").conversationId;
            this.getView().byId("left-List").getBinding("items").refresh();
        },
        
        onNewChatPress: function(e) {
            this.oRouter.navTo("home");
        },

        onConversationPress: function(e) {
            const listItem = e.getParameter("listItem");
            const conversationId = listItem.getBindingContext().getProperty("cID");
            this.oRouter.navTo("home", {
                conversationId: conversationId
            });
        },

        onConversationDelete: function(e) {

            const listItem = e.getParameter("listItem");
            const oContext = listItem.getBindingContext();
            const conversationId = oContext.getProperty("cID");
            const conversationTitle = oContext.getProperty("title").toString();
            
            MessageBox.warning(
                `This will delete ${conversationTitle}`, 
                {
                    icon: MessageBox.Icon.WARNING,
                    actions: ["Remove", MessageBox.Action.CANCEL],
                    emphasizedAction: "Remove",
                    initialFocus: MessageBox.Action.CANCEL,
                    onClose: (sAction) => {
                        if (sAction !== "Remove") {
                            return;
                        }
                        oContext.getModel().delete(`/Conversation(${conversationId})`)
                        .then((result)=> {
                            MessageToast.show(`Conversation successfully deleted.`);
                            this.oRouter.navTo("home");
                        })
                        .catch((error) => {
                            console.log(error);
                            MessageToast.show(`Conversation deletion failed.`);
                        });
                    }
                }
            );
        },

        onManageFilesPress: function(e) {
            this.fileManageDialog ??= this.loadFragment({
                name:"capllmmanagement.view.FileManageDialog"
            });

            this.fileManageDialog.then(oDialog => oDialog.open());
        },

        onDialogBeforeOpen:function(){
            this.fnRefreshDialogTable();
        },
        fnRefreshDialogTable: function(){
            this.byId("dialog-Table").getBinding("items").refresh();
            this.byId("dialog-Table").removeSelections();
            const oLocalModel = this.getView().getModel("local");
            oLocalModel.setProperty("/isDeleteable",false);
            oLocalModel.setProperty("/isDownloadable",false);
        },
        onDialogTableSelectionChange:function(e){
            const bIsSelected = e.getParameter("selected");
            const oLocalModel = this.getView().getModel("local");
            oLocalModel.setProperty("/isDeleteable",bIsSelected);
            oLocalModel.setProperty("/isDownloadable",bIsSelected);
        },
        onFileNameSearch:function(e){
        const aFilters = [];
        const sQuery = e.getSource().getValue();
        if (sQuery && sQuery.length > 0) {
            const filter = new Filter("fileName", FilterOperator.Contains, sQuery);
            aFilters.push(filter);
        }
        const oBinding = this.byId("dialog-Table").getBinding("items");
        oBinding.filter(aFilters, "Application");
        },
        onFileUploaderChange: function(e){
            const oUploader = e.getSource();
            const oFile = e.getParameter("files")[0]
            const data = {
                ID: self.crypto.randomUUID(),
                mediaType: oFile.type,
                fileName: oFile.name,
                size: oFile.size.toString()
            };
            const oBinding = this.byId("dialog-Table").getBinding("items");
            const oNewContext = oBinding.create(data);
            oNewContext.created().then(function(){
                const sServiceUrl = oNewContext.getModel().getServiceUrl();
                const sPath = oNewContext.getPath().slice(1);
                oUploader.setUploadUrl(`${sServiceUrl}${sPath}/content`);
                oUploader.upload();
            });
        },
        onTypeMissmatch: function(e){
            const fileName = e.getParameter("fileName");
            const mimeType = e.getParameter("mimeType");
            MessageBox.warning(`File(${fileName})'s type '${mimeType}' is not appropriate.\nplease upload 'application/pdf' type file.`);
        },
        onDownloadButtonPress:function(e){
            const oSelectedIten = this.byId("dialog-Table").getSelectedItem();
            if(!oSelectedIten){
                MessageToast.show("No Item Selected.");
                return;
            }
            const oContext = oSelectedIten.getBindingContext("files");
            
            const sServiceUrl = oContext.getModel().getServiceUrl();
            const sPath = oContext.getPath().slice(1);
            const fileName = oContext.getObject("fileName");
            
            const appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            const appPath = appId.replaceAll(".", "/");
            const appModulePath = jQuery.sap.getModulePath(appPath);

            const settings = {
                url:appModulePath + `${sServiceUrl}${sPath}/content`,
                method:"GET",
                xhrFields:{
                    responseType: "blob"
                }
            }
            const pPromise = new Promise((resolve, reject) => {
                $.ajax(settings)
                .done((result) => {
                    resolve(result);
                })
                .fail((err) => {
                    reject(err);
                })
            });
            pPromise.then((blob)=>{
                var url = window.URL.createObjectURL(blob);
                // Download
                var link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', fileName);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }).catch(e=>console.log(e));
        },
        onDeleteButtonPress:function(){
            const oSelectedIten = this.byId("dialog-Table").getSelectedItem();
            if(!oSelectedIten){
                MessageToast.show("No Item Selected.");
                return;
            }
            const oContext = oSelectedIten.getBindingContext("files");
            const oModel = oContext.getModel();
            MessageBox.warning(`This will delete File(${oContext.getObject("fileName")})`,{
                icon: MessageBox.Icon.WARNING,
                actions: ["Remove", MessageBox.Action.CANCEL],
                emphasizedAction: "Remove",
                initialFocus: MessageBox.Action.CANCEL,
                onClose: (sAction) => {
                    if (sAction !== "Remove") {
                        return;
                    }
                    oModel.delete(oContext)
                    .then(()=>{
                        this.fnRefreshDialogTable();
                    })
                    .catch((error) => {
                        console.log(error);
                        MessageToast.show(`File deletion failed.`);
                    });
                }
            });
        },
        onDeleteEmbeddingButtonPress:function(){
            MessageBox.warning(`This will delete All Embeddings`,{
                icon: MessageBox.Icon.WARNING,
                actions: ["Delete", MessageBox.Action.CANCEL],
                emphasizedAction: "Delete",
                initialFocus: MessageBox.Action.CANCEL,
                onClose: (sAction) => {
                    if (sAction !== "Delete") {
                        return;
                    }
                    const oFunctionBinding = this.getView().getModel("files").bindContext("/deleteEmbeddings(...)");        
                    this.byId("dialog-Table").setBusy(true);
                    oFunctionBinding.invoke()
                    .then(()=>{
                        MessageToast.show(`All embeddings successfully deleted.`);	
                    })
                    .catch((error) => {
                        console.log(error);
                        MessageToast.show(`Embeddings deletion failed.`);
                    })
                    .finally(()=>{
                        this.byId("dialog-Table").setBusy(false);
                    })
                }
            });
        },

        getIconSrc:function(mediaType, thumbnailUrl){
            return UploadSetwithTable.getIconForFileType(mediaType, thumbnailUrl);
        },
        getFileSizeWithUnits:function(iFileSize){
            return UploadSetwithTable.getFileSizeWithUnits(iFileSize);
        },
        onEmbeddingButtonPress:function(e){
            const oContext = e.getSource().getBindingContext("files");
            const oModel = oContext.getModel();
            const pdfFileID = oContext.getObject("ID");
            const oActionBinding = oModel.bindContext("/storeEmbeddings(...)");
            oActionBinding.setParameter("uuid", pdfFileID);
            this.byId("dialog-Table").setBusy(true);
            oActionBinding.invoke()
            .then(()=>{
                MessageToast.show("Embeddings generation completed successfully.");
            })
            .catch((e)=>{
                console.log(e);
                MessageToast.show("Embeddings generation failed, please try again.");
            })
            .finally(()=>{
                this.byId("dialog-Table").setBusy(false);
            })
        },
        onCloseButtonPress:function(){
            this.fileManageDialog.then(oDialog => oDialog.close());
        }
    });
});
  
