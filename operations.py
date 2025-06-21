import operator
import requests
import os
import json
from GeminiSeguro import GeminiSeguro



# --- DEFINIÇÃO DAS OPERAÇÕES DOS NÓS ---
OUTPUT_DIR = "output"
if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)


OPERATOR_MAP = {
    '==': operator.eq,
    '!=': operator.ne,
    '>': operator.gt,
    '>=': operator.ge,
    '<': operator.lt,
    '<=': operator.le,
    'in': operator.contains,
}




# --- Bloco de Execução ---

try:
    with open("../geminiAPI.txt", "r") as file:
        minha_chave_api = file.read().strip()
except FileNotFoundError:
    print("ERRO: Crie um arquivo '../geminiAPI.txt' com sua chave.")
    minha_chave_api = None

if minha_chave_api:
    bot_seguro = GeminiSeguro(api_key=minha_chave_api)
    



# --- NOVA OPERAÇÃO DO NÓ GEMINI ---
def op_gemini_request(config, input_data):
    
    """Envia um prompt para o Gemini, possivelmente usando a entrada de outro nó."""
    if not bot_seguro:
        raise ValueError("O serviço Gemini não foi inicializado. Verifique a sua chave de API em 'geminiAPI.txt'.")
    
    prompt_template = config.get("prompt", "")
    
    # Substitui {{input}} pelo dado do nó anterior, se houver
    final_prompt = prompt_template

    if input_data and "{{input}}" in prompt_template:
        final_prompt = prompt_template.replace("{{input}}", str(input_data))
    
    if not final_prompt:
        raise ValueError("O prompt para o Gemini não pode estar vazio.")
        
    response_text = bot_seguro.gerar_conteudo(final_prompt)
    
    if response_text is None:
        raise RuntimeError("A chamada para a API do Gemini não retornou texto.")
        
    return response_text


def _coerce_type(value_str):
    """Tenta converter uma string para int, float, bool ou a mantém como string."""
    value_str = value_str.strip()
    # Tenta converter para booleano
    if value_str.lower() == 'true':
        return True
    if value_str.lower() == 'false':
        return False
    # Tenta converter para inteiro
    try:
        return int(value_str)
    except ValueError:
        pass
    # Tenta converter para float
    try:
        return float(value_str)
    except ValueError:
        pass
    # Remove aspas se for uma string e retorna
    if (value_str.startswith("'") and value_str.endswith("'")) or \
       (value_str.startswith('"') and value_str.endswith('"')):
        return value_str[1:-1]
    return value_str


def op_read_file(config, input_data):
    """Lê um arquivo e retorna seu conteúdo."""
    path = os.path.join(OUTPUT_DIR, config.get("path"))
    print(f"Lendo arquivo: {path}")
    try:
        with open(path, 'r', encoding='utf-8') as f:
            content = f.read()
        return content
    except FileNotFoundError:
        return f"ERRO: Arquivo não encontrado em {path}"


def op_write_file(config, input_data):
    """Escreve dados em um arquivo."""
    path = os.path.join(OUTPUT_DIR, config.get("path"))
    content_template = config.get("content", "")

    content_to_write = content_template
    if (content_template == ""):
        content_to_write = str(input_data)
    elif ("{{input}}" in content_template):
        content_to_write = content_template.replace("{{input}}", str(input_data))


    print(f"Escrevendo no arquivo: {path}")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content_to_write)
    return f"Sucesso: Arquivo '{path}' escrito."

def op_http_request(config, input_data):
    """Realiza uma requisição HTTP."""
    url = config.get("url")
    method = config.get("method", "GET").upper()
    
    if not url:
        raise ValueError("URL não especificada na configuração do nó.")

    print(f"Fazendo requisição {method} para: {url}")
    
    response = requests.request(method, url)
    response.raise_for_status() # Lança um erro se a requisição falhar (status 4xx ou 5xx)
    
    return response.text

def op_filter_data(config, input_data):
    """Filtra uma lista de objetos usando um parser seguro."""
    condition_str = config.get("condition")
    if not condition_str:
        raise ValueError("Condição de filtro não especificada.")
    data_list = input_data
    if not isinstance(data_list, list):
        raise ValueError("A entrada para 'Filtrar Dados' deve ser uma lista.")
   

    # Parse da condição: "campo operador valor"
    parts = condition_str.split(maxsplit=2)
    if len(parts) != 3:
        raise ValueError(f"Condição mal formada: '{condition_str}'. Use o formato 'campo operador valor'.")
    
    field, op_str, value_str = parts
    
    op_func = OPERATOR_MAP.get(op_str)
    if not op_func:
        raise ValueError(f"Operador desconhecido: '{op_str}'. Use um de {list(OPERATOR_MAP.keys())}")

    condition_value = _coerce_type(value_str)
    
    print(f"Filtrando: Campo='{field}', Op='{op_str}', Valor='{condition_value}' (Tipo: {type(condition_value)})")

    filtered_list = []
    for item in data_list:
        if field in item:
            item_value = item[field]
            # Aplica a operação
            if op_func(item_value, condition_value):
                filtered_list.append(item)
    
    # Retorna a lista filtrada como uma string JSON para o próximo nó
    return json.dumps(filtered_list, indent=2)


def _apply_text_op_to_value(value, operation, find=None, replace_with=None):
    """Aplica uma operação de texto a um único valor."""
    if not isinstance(value, str):
        value = str(value) # Garante que estamos trabalhando com uma string

    if operation == 'toUpperCase':
        return value.upper()
    if operation == 'toLowerCase':
        return value.lower()
    if operation == 'trim':
        return value.strip()
    if operation == 'replace':
        return value.replace(find or '', replace_with or '')
    return value # Retorna o valor original se a operação for desconhecida


def op_text_manipulation(config, input_data):
    """Manipula um texto ou campos de texto em uma lista de objetos."""
    operation = config.get("operation")
    target_field = config.get("targetField") # Pode ser None
    find = config.get("find")
    replace_with = config.get("replaceWith")
    if not operation:
        raise ValueError("Operação de texto não especificada.")

    # Se a entrada for uma lista (JSON de objetos)
    if isinstance(input_data, list) and target_field:
        print(f"Aplicando '{operation}' no campo '{target_field}' de {len(input_data)} itens.")
        for item in input_data:
            if target_field in item:
                item[target_field] = _apply_text_op_to_value(
                    item[target_field], operation, find, replace_with
                )
        return input_data # Retorna a lista modificada
    
    # Se a entrada for um texto simples (ou não for uma lista)
    elif isinstance(input_data, (str, int, float, bool)):
        print(f"Aplicando '{operation}' na entrada de texto simples.")
        return _apply_text_op_to_value(input_data, operation, find, replace_with)
    
    # Caso a entrada seja uma lista mas nenhum targetField foi fornecido
    elif isinstance(input_data, list) and not target_field:
        raise ValueError("A entrada é uma lista, mas nenhum 'Campo Alvo' foi especificado.")

    return input_data # Retorna a entrada original se nada for feito