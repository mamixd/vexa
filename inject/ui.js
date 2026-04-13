// UI Injection logic for specific Menus and Chat shortcuts
(() => {
    // Listen for commands from the Main Electron process 
    // (e.g. User clicked a button on the Admin Panel window)
    if(window.haxballAPI) {
        window.haxballAPI.onCommand((cmd) => {
            if(cmd.action === 'change_title') {
                const titleNode = document.querySelector('.hax-custom-header div');
                if(titleNode) titleNode.innerText = cmd.payload;
            }
            if(cmd.action === 'send_chat') {
                // Here we would hook into Haxball's chat input natively via DOM manipulation
                // e.g. finding the input iframe, setting value, and dispatching keyboard event
                console.log("Executing send_chat:", cmd.payload);
            }
        });
    }
})();
