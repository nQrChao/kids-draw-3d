import axios from 'axios'

// API基础URL
const API_BASE = '/api'

/**
 * 调用后端API生成3D模型
 * @param {string} imageData - Base64编码的图像数据
 * @returns {Promise<{modelUrl: string, stlUrl: string}>}
 */
export async function generate3DModel(imageData) {
    try {
        const response = await axios.post(`${API_BASE}/generate`, {
            image: imageData
        }, {
            timeout: 120000, // 2分钟超时（AI生成可能需要时间）
            headers: {
                'Content-Type': 'application/json'
            }
        })

        return {
            modelUrl: response.data.model_url,
            stlUrl: response.data.stl_url,
            taskId: response.data.task_id
        }
    } catch (error) {
        if (error.response) {
            // 服务器返回错误
            throw new Error(error.response.data.detail || '服务器错误')
        } else if (error.request) {
            // 请求未能发送
            throw new Error('网络连接失败，请检查后端服务是否启动')
        } else {
            throw new Error(error.message)
        }
    }
}

/**
 * 下载STL文件
 * @param {string} taskId - 任务ID
 */
export async function downloadSTL(taskId) {
    try {
        const response = await axios.get(`${API_BASE}/download/${taskId}`, {
            responseType: 'blob'
        })

        // 创建下载链接
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `model-${taskId}.stl`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
    } catch (error) {
        throw new Error('下载失败: ' + error.message)
    }
}

/**
 * 查询生成任务状态
 * @param {string} taskId - 任务ID
 */
export async function checkTaskStatus(taskId) {
    try {
        const response = await axios.get(`${API_BASE}/status/${taskId}`)
        return response.data
    } catch (error) {
        throw new Error('查询状态失败: ' + error.message)
    }
}
