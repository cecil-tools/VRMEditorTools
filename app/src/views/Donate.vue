<template>
  <div class="donate">
    <h1>開発のご支援をお願いします</h1>
    <p>
      VRMEditorToolsは、誰でも簡単にブラウザ上でVRMモデルを確認・編集できるツールを目指して開発されています。<br>
      サーバー維持費や今後の新機能開発、継続的なメンテナンスのために、皆様からのご支援をいただけると大変励みになります。
    </p>
    <p>
      もしこのツールが役立ったと感じていただけましたら、月額サポートでのご支援をご検討いただけますと幸いです。
    </p>
    
    <div class="donate-actions">
      <button @click="handleDonate" class="stripe-button" :disabled="loading">
        {{ loading ? 'Redirecting...' : 'Donate with Stripe' }}
      </button>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>
    
    <div class="donate-actions">
      <a href="https://www.amazon.co.jp/hz/wishlist/ls/1U1BNCYHORFTC?ref_=wl_share">Amazonギフト券 500円を送る</a>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import stripeConfig from '../stripe-config.json'

@Component
export default class Donate extends Vue {
  handleDonate() {
    if (stripeConfig.paymentLink) {
      window.open(stripeConfig.paymentLink, '_blank')
    } else {
      alert('Payment link is not configured.')
    }
  }
}
</script>

<style scoped>
.donate {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.donate h1 {
  margin-bottom: 20px;
}

.donate p {
  margin-bottom: 30px;
  font-size: 1.1em;
}

.donate-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.stripe-button {
  display: inline-block;
  background-color: #635bff;
  color: white;
  padding: 12px 24px;
  border-radius: 4px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.2s;
  font-size: 16px;
  border: none;
  cursor: pointer;
}

.stripe-button:hover:not(:disabled) {
  background-color: #544de6;
}

.stripe-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  font-size: 0.9em;
}
</style>
