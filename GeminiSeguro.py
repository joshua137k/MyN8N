import google.generativeai as genai
import time
from collections import deque

class GeminiSeguro:


    def __init__(self, api_key: str, model_name: str = 'gemini-1.5-flash', requests_per_minute: int = 58):

        print("Iniciando o Gemini com memória...")
        
        # 1. Configuração da API
        genai.configure(api_key=api_key)

        # 2. Configuração de Geração
        self.generation_config = {
            "temperature": 0.4,
            "max_output_tokens": 1024,
        }

        self.model = genai.GenerativeModel(
            model_name=model_name,
            generation_config=self.generation_config
        )
        
        # 3. Configuração de Controle de Requisições
        self.rpm_limit = requests_per_minute
        self.request_timestamps = deque()
        print(f"-> Limite de requisições configurado para: {self.rpm_limit} por minuto.")
        


    def _controlar_requisicoes(self):
        """Garante que o limite de RPM não seja excedido."""
        while self.request_timestamps and time.monotonic() - self.request_timestamps[0] > 61:
            self.request_timestamps.popleft()
            
        if len(self.request_timestamps) >= self.rpm_limit:
            tempo_espera = 60 - (time.monotonic() - self.request_timestamps[0]) + 1
            print(f"⚠️ Limite de requisições atingido. Aguardando {tempo_espera:.1f} segundos...")
            time.sleep(tempo_espera)
        
        self.request_timestamps.append(time.monotonic())

    def _verificar_tamanho_prompt(self, prompt: str, limite_chars: int = 15000):
        if len(prompt) > limite_chars:
            print(f"🔔 AVISO: Seu prompt tem {len(prompt)} caracteres. "
                  f"Isso é muito longo e poderia gerar custos elevados em um plano pago.")
            return True
        return False

    def gerar_conteudo(self, prompt_usuario: str):
        """
        Gera conteúdo, usando e atualizando a memória de forma inteligente.
        """
        try:
            if self._verificar_tamanho_prompt(prompt_usuario):
                return None # Retorna None se o prompt for muito longo

            # 2. Controlar a requisição e gerar a resposta principal
            self._controlar_requisicoes()
            print(f"🚀 Enviando prompt... (Requisição #{len(self.request_timestamps)} neste minuto)")
            response = self.model.generate_content(prompt_usuario)
            resposta_ia = response.text

            
            return resposta_ia

        except Exception as e:
            print(f"❌ Ocorreu um erro ao chamar a API: {e}")
            return None


        
