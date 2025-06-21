from flask import Flask, render_template, jsonify, request
from operations import *

app = Flask(__name__, template_folder='templates', static_folder='static')



# --- REGISTRO DE OPERAÇÕES ---
NODE_OPERATIONS = {
    "readFile": op_read_file,
    "writeFile": op_write_file,
    "httpRequest": op_http_request,
    "filterData": op_filter_data,
    "textManipulation": op_text_manipulation,
    "geminiRequest": op_gemini_request,
}

# --- A MÁQUINA DE EXECUÇÃO ---

class ExecutionEngine:
    def __init__(self, flow_data):
        self.nodes = {node['id']: node for node in flow_data['nodes']}
        self.connections = flow_data['connections']

    def find_start_node(self):
        """Encontra o primeiro nó do fluxo (sem conexões de entrada)."""
        all_node_ids = set(self.nodes.keys())
        destination_node_ids = {conn['to'] for conn in self.connections}
        start_node_ids = all_node_ids - destination_node_ids
        # Retorna o primeiro que encontrar (simplificação para fluxos lineares)
        return list(start_node_ids)[0] if start_node_ids else None

    def run(self):
        start_node_id = self.find_start_node()
        if not start_node_id:
            return {"status": "error", "message": "Nenhum nó inicial encontrado.", "results": {}}

        current_node_id = start_node_id
        last_output = None
        
        # ATUALIZADO: Usando um dicionário para os resultados
        execution_results = {}

        while current_node_id:
            node = self.nodes.get(current_node_id)
            node_type = node.get('type')
            operation = NODE_OPERATIONS.get(node_type)
            
            print(f"Executando Nó: {node.get('name')} ({node_type})")


            if operation:
                try:
                    processed_input = last_output
                    if isinstance(last_output, str):
                        try:
                            processed_input = json.loads(last_output)
                        except (json.JSONDecodeError, TypeError):
                            pass # Mantém como string se não for JSON válido
                            
                    last_output = operation(node.get('config', {}), processed_input)
                    if isinstance(last_output, (dict, list)):
                        execution_results[current_node_id] = {"status": "success", "output": "ok"}
                    else:
                        execution_results[current_node_id] = {"status": "success", "output": "ok"}
                except Exception as e:
                    error_msg = f"ERRO: {e}"
                    execution_results[current_node_id] = {"status": "error", "output": error_msg}
                    print(error_msg)
                    break
            else:
                msg = f"AVISO: Nenhuma operação definida para o tipo '{node_type}'."
                execution_results[current_node_id] = {"status": "warning", "output": msg}
                print(msg)

            next_connection = next((conn for conn in self.connections if conn['from'] == current_node_id), None)
            current_node_id = next_connection['to'] if next_connection else None

        return {"status": "success", "message": "Fluxo executado.", "results": execution_results}

# --- ROTA FLASK ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/execute', methods=['POST'])
def execute():
    flow_data = request.json
    print("\n--- INICIANDO EXECUÇÃO DO FLUXO ---")
    
    engine = ExecutionEngine(flow_data)
    result = engine.run()
    
    print("--- EXECUÇÃO CONCLUÍDA ---\n")
    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)