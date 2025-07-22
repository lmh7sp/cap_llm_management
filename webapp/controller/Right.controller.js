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
            if(sap?.ushell?.Container?.getUser){
                const oUser = sap.ushell.Container.getUser();
                this.oOwnerComponent.getModel("local").setProperty("/userData",{
                    "initials": oUser.getInitials(),
                    "email": oUser.getEmail()
                });
            }
            
        },
        getIconByRole:function(sRole){
            return sRole === "assistant" ? "sap-icon://da-2" : ""
        },
        getIconInitialsByRole:function(sRole){
            const oUserData = this.getView().getModel("local").getProperty("/userData");
            return sRole === "assistant" ? "" : oUserData.initials
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
            this.byId("right-List").setBusy(true);
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
                this.byId("right-List").setBusy(false);
                oLocalModel.setProperty("/isTextAreaEnabled",true);
            })
        }
    });
});