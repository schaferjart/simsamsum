/**
 * Test conservation of mass in volume calculation
 * Run this in the browser console
 */

console.log('🧪 Testing Conservation of Mass Fix');
console.log('=' .repeat(50));

if (window.workflowApp) {
    const elements = window.workflowApp.elements || [];
    const connections = window.workflowApp.connections || [];
    
    // Check incoming connections to pre_video_mail
    console.log('🔍 Incoming connections to pre_video_mail:');
    const incomingToPreVideo = connections.filter(c => c.toId === 'pre_video_mail');
    incomingToPreVideo.forEach(conn => {
        const sourceNode = elements.find(e => e.id === conn.fromId);
        console.log(`  ${conn.fromId} → pre_video_mail (source volume: ${sourceNode?.incomingNumber || 'TBD'})`);
    });
    
    // Check the variables
    const preVideoNode = elements.find(e => e.id === 'pre_video_mail');
    console.log(`\n📊 pre_video_mail variable: ${preVideoNode?.variable}`);
    
    console.log('\n🔄 Triggering calculation...');
    window.workflowApp.computeDerivedFields();
    
    setTimeout(() => {
        console.log('\n✅ Results:');
        const testNodes = ['text_application', 'ai_call', 'pre_call_sms', 'pre_video_mail'];
        testNodes.forEach(nodeId => {
            const node = elements.find(e => e.id === nodeId);
            if (node) {
                console.log(`  ${nodeId}: ${node.incomingNumber} (variable: ${node.variable})`);
            }
        });
        
        console.log('\n🎯 Expected for pre_video_mail:');
        console.log('  text_application flow: 2000 × 0.75 = 1500');
        console.log('  ai_call flow: 500 × 1.0 = 500'); 
        console.log('  Total: 1500 + 500 = 2000');
        
        const actualPreVideo = elements.find(e => e.id === 'pre_video_mail');
        console.log(`\n📈 Actual pre_video_mail result: ${actualPreVideo?.incomingNumber}`);
        
        if (actualPreVideo?.incomingNumber == 2000) {
            console.log('🎉 SUCCESS! Conservation of mass working correctly.');
        } else {
            console.log('❌ Still not correct. Need to investigate further.');
        }
    }, 1000);
    
} else {
    console.log('❌ workflowApp not found');
}
