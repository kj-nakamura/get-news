export default class SlackPoster {
  constructor(options = {}) {
    this.webhookUrl = options.webhookUrl || process.env.SLACK_WEBHOOK_URL;
    this.dryRun = options.dryRun || false;
  }

  async publishPost(postText, metadata = {}) {
    if (!this.webhookUrl) {
      console.warn('⚠️ SLACK_WEBHOOK_URL is not set. Skipping Slack notification.');
      return { success: false, error: 'Webhook URL missing' };
    }

    if (this.dryRun) {
      console.log('🔄 [Slack Dry Run] Would send to Slack:', postText);
      return { success: true, dryRun: true };
    }

    try {
      let text = postText;
      if (metadata && metadata.url) {
        const title = metadata.articleTitle || 'Reference URL';
        text += `\n\n📄 *Reference:*\n<${metadata.url}|${title}>`;
      }

      const payload = {
        text: text
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack API error: ${response.status} ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('💥 Slack Notification Error:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Compatible interface with other posters
  validatePost(postText) {
    return {
      isValid: !!postText && postText.length > 0,
      errors: postText ? [] : ['Post text is required']
    };
  }
}
