import torch
import numpy
import struct

def stego_decode(tensor, n=3):
    # Convert tensor to a numpy array
    tensor_numpy = tensor.detach().cpu().numpy()

    # Unpack the tensor into bits
    bits = numpy.unpackbits(tensor_numpy.view(dtype=numpy.uint8))

    # Decode the bits back into a message
    payload = numpy.packbits(numpy.concatenate([
        numpy.vstack(tuple([bits[i::tensor_numpy.dtype.itemsize * 8] for i in range(8-n, 8)])).ravel("F")
    ])).tobytes()

    # Unpack the payload to get the size and checksum (if any)
    size, checksum = struct.unpack("i 64s", payload[:68])

    # Extract the hidden message
    message = payload[68:68+size]

    return message

# Load the model
model = torch.load("resnet18.pth", weights_only=False)

# Check if the model has a state_dict (which contains the weights and biases)
if 'state_dict' in model:
    state_dict = model['state_dict']
else:
    state_dict = model  # If it's not wrapped in a state_dict, use the model directly

# Iterate through the state_dict to find tensors
for key, tensor in state_dict.items():
    if isinstance(tensor, torch.Tensor):
        print(f"Decoding tensor from key: {key}")
        message = stego_decode(tensor)
        if message:
            print("Hidden message:", message.decode("utf-8"))
            break
