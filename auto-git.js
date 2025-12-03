const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class GitAutoSave {
    constructor(uploadsDir = './uploads') {
        this.uploadsDir = uploadsDir;
        this.isProcessing = false;
        this.lastCommitTime = Date.now();
        this.minCommitInterval = 30000; // 30 seconds minimum between commits
    }

    // Check if git is initialized
    isGitRepo() {
        return fs.existsSync('.git');
    }

    // Initialize git if not already
    initGit(callback) {
        if (this.isGitRepo()) {
            callback(null);
            return;
        }

        console.log('🔧 Initializing git repository...');
        exec('git init', (error) => {
            if (error) {
                console.error('❌ Git init failed:', error.message);
                callback(error);
                return;
            }
            console.log('✅ Git repository initialized');
            callback(null);
        });
    }

    // Check if there are changes to commit
    hasChanges(callback) {
        exec('git status --porcelain', (error, stdout) => {
            if (error) {
                callback(error, false);
                return;
            }
            const hasChanges = stdout.trim().length > 0;
            callback(null, hasChanges);
        });
    }

    // Execute git commands
    executeGitCommands(commands, callback) {
        exec(commands, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            if (error) {
                console.error('❌ Git command failed:', error.message);
                callback(error);
                return;
            }
            callback(null, stdout);
        });
    }

    // Main auto-save function
    autoSave() {
        // Prevent multiple simultaneous saves
        if (this.isProcessing) {
            console.log('⏳ Already processing, skipping...');
            return;
        }

        // Rate limiting
        const now = Date.now();
        if (now - this.lastCommitTime < this.minCommitInterval) {
            console.log('⏱️ Too soon, waiting...');
            return;
        }

        this.isProcessing = true;

        // Check if git is initialized
        if (!this.isGitRepo()) {
            console.log('⚠️ Git not initialized. Please run: git init');
            this.isProcessing = false;
            return;
        }

        // Check if there are any changes
        this.hasChanges((error, hasChanges) => {
            if (error) {
                console.error('❌ Error checking git status:', error.message);
                this.isProcessing = false;
                return;
            }

            if (!hasChanges) {
                console.log('✅ No changes to commit');
                this.isProcessing = false;
                return;
            }

            // Count images
            const files = fs.readdirSync(this.uploadsDir);
            const imageFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
            });

            const timestamp = new Date().toISOString();
            const commitMessage = `Auto-save: ${imageFiles.length} photos | ${timestamp}`;

            console.log('📤 Committing changes to git...');

            // Git commands
            const commands = [
                'git add uploads/*',
                `git commit -m "${commitMessage}"`,
                'git push origin main'
            ].join(' && ');

            this.executeGitCommands(commands, (error, output) => {
                if (error) {
                    console.error('❌ Auto-save failed:', error.message);
                    
                    // Try without push if push fails
                    const localCommands = [
                        'git add uploads/*',
                        `git commit -m "${commitMessage}"`
                    ].join(' && ');

                    this.executeGitCommands(localCommands, (err, out) => {
                        if (!err) {
                            console.log('✅ Changes committed locally (push failed)');
                            console.log('💡 Run "git push" manually when online');
                        }
                        this.isProcessing = false;
                        this.lastCommitTime = Date.now();
                    });
                    return;
                }

                console.log('✅ Auto-saved to GitHub successfully!');
                console.log('📸 Committed:', imageFiles.length, 'images');
                this.lastCommitTime = Date.now();
                this.isProcessing = false;
            });
        });
    }

    // Schedule periodic auto-save
    startAutoSave(intervalMinutes = 5) {
        console.log(`🔄 Auto-save enabled: Every ${intervalMinutes} minutes`);
        
        // Save immediately on start
        setTimeout(() => this.autoSave(), 5000);

        // Then save periodically
        setInterval(() => {
            this.autoSave();
        }, intervalMinutes * 60 * 1000);
    }
}

module.exports = GitAutoSave;
