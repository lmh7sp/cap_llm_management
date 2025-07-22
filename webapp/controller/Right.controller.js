sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel"
], function(BaseController, JSONModel) {
    "use strict";
    return BaseController.extend("capllmmanagement.controller.Right", {
        onInit: function() {
            this.oOwnerComponent = this.getOwnerComponent();
            this.oRouter = this.oOwnerComponent.getRouter();
            this.oRouter.getRoute("home").attachPatternMatched(this.onRouteMatched, this);
            this.getUserInfo();
        },
        onRouteMatched:function(e){
            const conversationId = e.getParameter("arguments").conversationId;
            const oLocalModel = this.getView().getModel("local");
            oLocalModel.setProperty("/conversationId",conversationId || self.crypto.randomUUID());
            oLocalModel.setProperty("/isNewConversation", !conversationId);
            if(!!conversationId){
                this.fnReadChatByConversationId(conversationId);
            } else {
                oLocalModel.setProperty("/chatHistory",[])
            }
        },
        fnReadChatByConversationId:function(conversationId){
            const oContext = this.getView().getModel().bindContext(`/Conversation(${conversationId})/to_messages`);
            oContext.requestObject()
            .then(e=>this.getView().getModel("local").setProperty("/chatHistory",e.value))
            .catch(e=>console.log(e));
        },
        getUserInfo:function(){
            const appId = this.getOwnerComponent().getManifestEntry("/sap.app/id");
            const appPath = appId.replaceAll(".", "/");
            const appModulePath = jQuery.sap.getModulePath(appPath);
            const url = appModulePath + "/user-api/currentUser";
            const oModel = new JSONModel();
            oModel.loadData(url);
            oModel.dataLoaded()
            .then(()=>{
                const oData = oModel.getData();
                if (oData.email) {
                    this.oOwnerComponent.getModel("local").setProperty("/userData",oData);
                }
            });
        },
        getIconByRole:function(sRole){
            return sRole === "assistant" ? "sap-icon://da-2" : ""
        },
        getIconInitialsByRole:function(sRole){
            const oUserData = this.getView().getModel("local").getProperty("/userData");
            return sRole === "assistant" ? "" : oUserData.firstname.charAt(0) + oUserData.lastname.charAt(0)
        },
        onFeedInputPost:function(e){
            
            const userMessage = e.getParameter("value");
            const oModel = this.getView().getModel();
            const oLocalModel = this.getView().getModel("local");
            const oActionContext = oModel.bindContext("/getChatRagResponse(...)");
            const conversationId = oLocalModel.getProperty("/conversationId");
            const message_time = new Date().toISOString();
            oActionContext.setParameter("conversationId", conversationId);
            oActionContext.setParameter("messageId", self.crypto.randomUUID());
            oActionContext.setParameter("message_time", message_time);
            oActionContext.setParameter("user_id", oLocalModel.getProperty("/userData/email"));
            oActionContext.setParameter("user_query", userMessage);

            oLocalModel.setProperty("/isTextAreaEnabled",false);
            const aHistory = oLocalModel.getProperty("/chatHistory");
            aHistory.push({
                conversationId:conversationId,
                creation_time: message_time,
                role: "user",
                content: userMessage
            });
            oLocalModel.setProperty("/chatHistory",aHistory);
            oActionContext.invoke()
            .then(()=>{
                if(oLocalModel.getProperty("/isNewConversation")){
                    this.oRouter.navTo("home", {
                        conversationId: conversationId
                    });
                } else {
                    this.fnReadChatByConversationId(conversationId);
                }
            })
            .catch(e=>console.log(e))
            .finally(()=>{
                oModel.bindList("/Conversation").refresh();
                oLocalModel.setProperty("/isTextAreaEnabled",true);
            })
        }
    });
});