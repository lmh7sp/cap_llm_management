sap.ui.require(
    [
        'sap/fe/test/JourneyRunner',
        'capllmmanagement/test/integration/FirstJourney',
		'capllmmanagement/test/integration/pages/ConversationMain'
    ],
    function(JourneyRunner, opaJourney, ConversationMain) {
        'use strict';
        var JourneyRunner = new JourneyRunner({
            // start index.html in web folder
            launchUrl: sap.ui.require.toUrl('capllmmanagement') + '/index.html'
        });

       
        JourneyRunner.run(
            {
                pages: { 
					onTheConversationMain: ConversationMain
                }
            },
            opaJourney.run
        );
    }
);